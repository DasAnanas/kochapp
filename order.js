/* dAIlykitchen – Bestell-Schnittstelle
 *
 * Jeder Anbieter ("Provider") ist ein Adapter mit:
 *   label    – Anzeigename
 *   fields   – Konfigurationsfelder für die Oberfläche
 *   preview(items, cfg, customer) -> Objekt  (die Anfrage, die gesendet würde)
 *   submit(items, cfg, customer)  -> Promise<{ ok, message, orderId?, total?, raw? }>
 *
 * In der Oberfläche steht ausschließlich REWE zur Verfügung.
 */
(function (root) {
  const KA = (root.KA = root.KA || {});

  function payload(items, customer, meta) {
    const lines = items.filter((i) => i.checked !== false);
    return {
      source: 'dAIlykitchen',
      createdAt: new Date().toISOString(),
      currency: 'EUR',
      customer: customer || {},
      note: (meta && meta.note) || '',
      items: lines.map((i) => ({
        sku: i.id || null, // null = frei eingetragener Artikel ohne Stammdaten
        name: i.name,
        category: KA.CATS[i.cat],
        quantity: i.amount,
        unit: i.unit,
      })),
    };
  }
  KA.orderPayload = payload;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- REWE: Warenkorb auf rewe.de füllen (lokale REWE-Bridge, Ordner rewe-bridge) ---------- */
  // In der Desktop-App laufen die Aufrufe über die App-Hülle (/api/rewe), die auch den API-Schlüssel setzt.
  // Im Browser spricht die Seite die Bridge direkt an; Adresse und Schlüssel stehen dann in der Konfiguration.
  const reweBase = (cfg) => (root.KA_DESKTOP ? '/api/rewe' : String(cfg.url || 'http://localhost:8765').replace(/\/+$/, ''));
  async function reweCall(cfg, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (!root.KA_DESKTOP && cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey;
    const res = await fetch(reweBase(cfg) + path, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
    let json = null;
    try { json = await res.json(); } catch (e) { /* leere Antwort */ }
    if (res.status === 401) throw new Error('Die REWE-Bridge lehnt den API-Schlüssel ab. Er steht im Fenster der Bridge.');
    if (!res.ok) throw new Error((json && json.error) || 'Die REWE-Bridge antwortete mit HTTP ' + res.status + '.');
    return json || {};
  }
  const reweAlive = async (cfg) => { try { await reweCall(cfg, '/health'); return true; } catch (e) { return false; } };

  // Einkaufsliste der App -> Format der Bridge. Stückware bekommt das Stückgewicht mit (für Packungen nach Gewicht).
  function reweItems(items) {
    return items.filter((i) => i.checked !== false).map((i) => {
      const ing = i.id && KA.ING[i.id];
      const search = String(i.name).replace(/[()]/g, ' ').split('/')[0].replace(/\s+/g, ' ').trim(); // „Kichererbsen (Dose)“ -> „Kichererbsen Dose“
      if (!ing) return { name: i.name, search, packages: 1 }; // frei eingetragener Artikel: Menge nicht umrechenbar
      const it = { sku: i.id, name: i.name, search, quantity: i.amount, unit: i.unit };
      if (ing.unit === 'Stk' && ing.gpu > 1) it.gramsPerUnit = ing.gpu;
      return it;
    });
  }

  KA.Providers = {
    rewe: {
      label: 'REWE – Warenkorb füllen (du bestellst selbst auf rewe.de)',
      help:
        'Legt die Artikel der Liste in deinen Warenkorb auf rewe.de und öffnet ihn im REWE-Fenster. Es wird nichts bestellt: ' +
        'Prüfen, Liefertermin wählen und „Bestellen“ machst du selbst auf rewe.de. Nach dem Klick wird deine Postleitzahl abgefragt. ' +
        (root.KA_DESKTOP
          ? 'Das läuft im Hintergrund: Das REWE-Fenster erscheint erst, wenn der Warenkorb fertig ist (benötigt Chrome oder Edge).'
          : 'Im Browser musst du vorher rewe-bridge\\start-rewe-bridge.cmd starten und den dort angezeigten API-Schlüssel hier eintragen.'),
      fields: root.KA_DESKTOP ? [] : [
        { k: 'url', label: 'Adresse der REWE-Bridge', placeholder: 'http://localhost:8765', type: 'url' },
        { k: 'apiKey', label: 'API-Schlüssel der Bridge', placeholder: 'steht im Fenster der Bridge', type: 'password' },
      ],
      needsZip: true,
      preview: (items, cfg) => ({ ziel: reweBase(cfg), market: { zipCode: cfg.zip || '(wird abgefragt)', service: cfg.service || 'DELIVERY' },
        order: { items: reweItems(items), options: { mode: 'set', openCheckout: true } } }),
      /** ctx: { zip, service, onProgress(text) } */
      async submit(items, cfg, customer, ctx) {
        const say = (t) => ctx && ctx.onProgress && ctx.onProgress(t);
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const zip = String((ctx && ctx.zip) || '').trim();
        if (!/^\d{5}$/.test(zip)) throw new Error('Bitte eine fünfstellige Postleitzahl angeben.');
        const service = ctx.service === 'PICKUP' ? 'PICKUP' : 'DELIVERY';

        // 1. Bridge erreichbar? In der Desktop-App bei Bedarf starten.
        if (!(await reweAlive(cfg))) {
          if (!root.KA_DESKTOP) throw new Error('Die REWE-Bridge läuft nicht. Bitte rewe-bridge\\start-rewe-bridge.cmd starten und erneut versuchen.');
          say('REWE wird im Hintergrund vorbereitet …');
          await reweCall(cfg, '/start', {});
          let up = false;
          for (let i = 0; i < 60 && !up; i++) { await wait(1000); up = await reweAlive(cfg); }
          if (!up) throw new Error('Die Verbindung zu REWE ließ sich nicht starten. Wird Chrome oder Edge gefunden? Einzelheiten stehen in rewe-bridge\\.data\\bridge.log.');
        }

        // 2. Markt zur Postleitzahl wählen und warten, bis die Bridge ihn übernommen hat
        say(`REWE-Markt für ${zip} wird gewählt …`);
        await reweCall(cfg, '/market', { zipCode: zip, service });
        let shop = null;
        for (let i = 0; i < 120; i++) {
          await wait(1000);
          const st = await reweCall(cfg, '/status');
          if (!st.busy && !st.queued) { shop = st.shop; break; } // Marktwahl ist abgearbeitet
        }
        // Braucht rewe.de den Menschen (Sicherheitsprüfung, Markt nicht wählbar), das sonst verborgene REWE-Fenster nach vorn holen
        if (!shop || shop.challenge || shop.zipCode !== zip || !shop.marketCode) { try { await reweCall(cfg, '/basket/open', {}); } catch (e) { /* Fenster bleibt verborgen */ } }
        if (shop && shop.challenge) throw new Error('rewe.de zeigt eine Sicherheitsprüfung. Bitte im REWE-Fenster bestätigen und erneut versuchen.');
        if (!shop || shop.zipCode !== zip || !shop.marketCode) {
          throw new Error(`Für die Postleitzahl ${zip} konnte kein REWE-${service === 'PICKUP' ? 'Abholmarkt' : 'Lieferservice'} gewählt werden. Bitte im REWE-Fenster prüfen oder die andere Variante wählen.`);
        }

        // 3. Liste übergeben und Fortschritt abfragen. Die Bridge legt nur in den Warenkorb – bestellt wird nie.
        const list = reweItems(items);
        let job = await reweCall(cfg, '/orders', { items: list, options: { mode: 'set', openCheckout: true, background: true } });
        while (job.status === 'queued' || job.status === 'running') {
          await wait(1000);
          job = await reweCall(cfg, '/orders/' + encodeURIComponent(job.orderId));
          if (job.progress) say(`REWE-Warenkorb wird gefüllt … ${job.progress.done} von ${job.progress.total}`);
        }
        if (job.status !== 'done') throw new Error(job.message || 'Die REWE-Bridge meldet einen Fehler.');
        const lines = (job.results || []).map((r) => (r.ok
          ? { ok: true, text: `${r.packages}× ${r.product.name}${r.product.price != null ? ' · ' + KA.fmtEUR(r.product.price) : ''} – für ${r.name}${r.note ? ' (' + r.note + ')' : ''}` }
          : { ok: false, text: `${r.name}: ${r.error}` }));
        const sum = job.summary || {};
        return {
          ok: true, orderId: job.orderId, lines,
          message: `${sum.added} von ${list.length} Artikeln liegen im REWE-Warenkorb` + (sum.estimatedTotal ? ` (ca. ${KA.fmtEUR(sum.estimatedTotal)})` : '') +
            '. Es wurde nichts bestellt – bitte den Warenkorb im REWE-Fenster prüfen und die Bestellung dort selbst abschließen.',
          raw: job,
        };
      },
    },

  };

  KA.listToText = (items, customer) => {
    const lines = items.filter((i) => i.checked !== false).map((i) => `- ${i.id ? KA.fmtAmount(i.id, i.amount) : i.label || ''} ${i.name}`.replace('-  ', '- '));
    const c = customer || {};
    const addr = [c.name, c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return 'Einkaufsliste\n\n' + lines.join('\n') + (addr ? '\n\nLieferadresse: ' + addr : '');
  };
})(typeof window !== 'undefined' ? window : globalThis);
