// Läuft im rewe.de-Tab (wird von rewe-bridge.ps1 injiziert).
// Sucht Produkte und setzt Warenkorb-Mengen über dieselben Endpunkte wie der REWE-Shop selbst.
(() => {
  'use strict';
  const PRODUCTS_ACCEPT = 'application/vnd.rewe.productlist+json';
  const BASKET_ACCEPT = 'application/vnd.com.rewe.digital.basket-v2+json';
  const MAX_PACKAGES = 20;

  // listingId -> Menge im Warenkorb (Stand beim Laden der Seite, danach lokal fortgeschrieben)
  const inBasket = { ...((window.ReweBasket || {}).listingIdToQuantityLookup || {}) };

  function status() {
    const b = window.ReweBasket || {}, m = b.sessionMarketInformation || {};
    return {
      challenge: !window.ReweBasket && /just a moment|nur einen moment|attention required|access denied/i.test(document.title),
      marketCode: String(b.marketCode || m.marketCode || ''),
      zipCode: String(b.zipCode || m.zipCode || ''),
      serviceTypes: (b.serviceTypes || m.serviceTypes || []).filter(Boolean),
      loggedIn: !!b.customerUuid,
      basketLines: Object.keys(inBasket).length,
      url: location.href,
    };
  }

  const num = s => parseFloat(String(s).replace(',', '.'));

  /** Packungsgröße aus "500g (1 kg = 3,98 €)", "6 Stück", "2x125g", "1,5l" → { g } | { ml } | { pieces } | null */
  function parseSize(text) {
    const m = /(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|liter|l|stück|stk|st|eier|er)(?![a-zäöü])/i.exec(String(text || '').split('(')[0]);
    if (!m) return null;
    const n = (m[1] ? +m[1] : 1) * num(m[2]), u = m[3].toLowerCase();
    if (!(n > 0)) return null;
    if (u === 'kg') return { g: n * 1000 };
    if (u === 'g') return { g: n };
    if (u === 'l' || u === 'liter') return { ml: n * 1000 };
    if (u === 'cl') return { ml: n * 10 };
    if (u === 'ml') return { ml: n };
    return { pieces: n };
  }

  /** Gewünschte Menge der App in g/ml/Stück umrechnen. */
  function wanted(item) {
    const q = Number(item.quantity) || 1, u = String(item.unit || '').trim().toLowerCase();
    if (u === 'g') return { g: q };
    if (u === 'kg') return { g: q * 1000 };
    if (u === 'ml') return { ml: q };
    if (u === 'l') return { ml: q * 1000 };
    const gpu = Number(item.gramsPerUnit) || 0;
    return { pieces: q, g: gpu ? q * gpu : undefined };
  }

  /** Anzahl Packungen, die die gewünschte Menge abdecken. */
  function packagesFor(item, size) {
    if (Number(item.packages) > 0) return { n: Math.ceil(item.packages) };
    const w = wanted(item);
    const amount = w.g !== undefined ? w.g : w.ml;            // g und ml werden 1:1 behandelt
    if (size) {
      const packAmount = size.g !== undefined ? size.g : size.ml;
      if (packAmount && amount !== undefined) return { n: Math.ceil(amount / packAmount - 1e-9) };
      if (size.pieces && w.pieces !== undefined) return { n: Math.ceil(w.pieces / size.pieces - 1e-9) };
    }
    if (!size && w.pieces !== undefined) return { n: Math.ceil(w.pieces), note: 'Packungsgröße unbekannt – Stückzahl übernommen' };
    return { n: 1, note: 'Menge nicht umrechenbar – 1 Packung gewählt' };
  }

  function listingOf(product) {
    const articles = (product._embedded && product._embedded.articles) || [];
    for (const a of articles) {
      const l = a._embedded && a._embedded.listing;
      if (l && l.id) return l;
    }
    return null;
  }

  async function search(term) {
    const qs = new URLSearchParams({ search: term, objectsPerPage: '30', page: '1' });
    const r = await fetch('/shop/api/products?' + qs, { headers: { accept: PRODUCTS_ACCEPT }, credentials: 'same-origin' });
    if (!r.ok) throw new Error('Suche fehlgeschlagen (HTTP ' + r.status + ')');
    const j = await r.json();
    return ((j._embedded && j._embedded.products) || []).map(p => ({ p, l: listingOf(p) })).filter(x => x.l);
  }

  async function setQuantity(listingId, quantity) {
    const r = await fetch('/shop/api/baskets/listings/' + encodeURIComponent(listingId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json', accept: BASKET_ACCEPT, pragma: 'no-cache', 'cache-control': 'no-cache',
        'x-origin': 'AddToBasketV2', 'x-application-id': 'rewe-basket',
      },
      body: JSON.stringify({ quantity, includeTimeslot: false, context: 'product-list' }),
    });
    if (!r.ok) throw new Error('Warenkorb lehnte ab (HTTP ' + r.status + ')');
    inBasket[listingId] = quantity;
  }

  /** item: { sku, name, quantity, unit, gramsPerUnit?, search?, productId?, packages? }, opts: { mode: 'set' | 'add' } */
  async function fillItem(item, opts) {
    const out = { ok: false, sku: item.sku || null, name: item.name, quantity: item.quantity, unit: item.unit || '' };
    try {
      const term = String(item.search || String(item.name || '').replace(/\s*\(.*?\)/g, '')).trim();   // "Reis (roh)" → "Reis"
      if (!term) throw new Error('Kein Suchbegriff');
      const hits = await search(term);
      if (!hits.length) throw new Error('Kein lieferbares Produkt für „' + term + '“ gefunden');
      const hit = (item.productId && hits.find(h => String(h.p.id) === String(item.productId))) || hits[0];
      const pricing = hit.l.pricing || {};
      const pk = packagesFor(item, parseSize(pricing.grammage) || parseSize(hit.p.productName));
      const limit = Number((hit.l.limitations || {}).orderLimit) || MAX_PACKAGES;
      const have = Number(inBasket[hit.l.id]) || 0;
      let n = Math.max(1, pk.n) + ((opts || {}).mode === 'add' ? have : 0);
      let note = pk.note || '';
      if (n > Math.min(limit, MAX_PACKAGES)) {
        n = Math.min(limit, MAX_PACKAGES);
        note = (note ? note + '; ' : '') + 'auf Bestellgrenze ' + n + ' gekürzt';
      }
      await setQuantity(hit.l.id, n);
      const href = hit.p._links && hit.p._links.detail && hit.p._links.detail.href;
      Object.assign(out, {
        ok: true, packages: n, note,
        product: {
          id: String(hit.p.id), listingId: hit.l.id, name: hit.p.productName, grammage: pricing.grammage || '',
          price: typeof pricing.currentRetailPrice === 'number' ? pricing.currentRetailPrice / 100 : null,
          url: href ? 'https://www.rewe.de/shop' + href : null,
        },
      });
    } catch (e) {
      out.error = String((e && e.message) || e);
    }
    return out;
  }

  /** Markt für eine PLZ wählen. service: 'DELIVERY' (Lieferservice) | 'PICKUP' (Abholservice, optional mit wwIdent des Markts). */
  async function selectMarket(zipCode, service, wwIdent) {
    const zip = String(zipCode || '').trim(), svc = String(service || 'DELIVERY').toUpperCase();
    if (!/^\d{5}$/.test(zip)) throw new Error('Die PLZ muss fünfstellig sein');
    const r = await fetch('/api/marketselection/zipcodes/' + zip + '/services', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('Für PLZ ' + zip + ' ist kein REWE-Service verfügbar (HTTP ' + r.status + ')');
    const portfolio = await r.json();
    let market = wwIdent ? String(wwIdent) : '';
    if (!market && svc === 'DELIVERY') {
      if (!portfolio.hasDelivery) throw new Error('Kein Lieferservice für PLZ ' + zip);
      market = portfolio.deliveryMarketWwIdent;
    }
    if (!market && svc === 'PICKUP') {
      const p = await fetch('/api/marketselection/zipcodes/' + zip + '/services/pickup', { credentials: 'same-origin' });
      const list = p.ok ? await p.json() : [];
      market = list[0] && list[0].wwIdent;
    }
    if (!market) throw new Error('Kein Markt für ' + svc + ' in PLZ ' + zip + ' gefunden');
    const s = await fetch('/shop/api/marketselection/userselections', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedService: svc, customerZipCode: zip, wwIdent: String(market) }),
    });
    if (!s.ok) throw new Error('Marktauswahl abgelehnt (HTTP ' + s.status + ')');
    return { zipCode: zip, service: svc, wwIdent: String(market) };
  }

  window.__reweBridge = { status, fillItem, selectMarket };
  return true;
})();
