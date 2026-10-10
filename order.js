/* Kochapp – Bestell-Schnittstelle
 *
 * Jeder Anbieter ("Provider") ist ein Adapter mit:
 *   label    – Anzeigename
 *   fields   – Konfigurationsfelder für die Oberfläche
 *   preview(items, cfg, customer) -> Objekt  (die Anfrage, die gesendet würde)
 *   submit(items, cfg, customer)  -> Promise<{ ok, message, orderId?, total?, raw? }>
 *
 * Eigenen Shop anbinden: unten in KA.Providers einen weiteren Eintrag ergänzen
 * (oder "Eigener REST-Endpunkt" verwenden und die Antwort-Zuordnung anpassen).
 */
(function (root) {
  const KA = (root.KA = root.KA || {});

  function payload(items, customer, meta) {
    const lines = items.filter((i) => i.checked !== false);
    return {
      source: 'Kochapp',
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
        estimatedPrice: Math.round(i.price * 100) / 100,
      })),
      estimatedTotal: Math.round(lines.reduce((s, i) => s + i.price, 0) * 100) / 100,
    };
  }
  KA.orderPayload = payload;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  KA.Providers = {
    mock: {
      label: 'Demo-Shop (Simulation)',
      help: 'Simuliert eine Bestellung ohne Netzwerk. Gut zum Ausprobieren der Abläufe.',
      fields: [],
      preview: (items, cfg, customer) => payload(items, customer),
      async submit(items, cfg, customer) {
        await sleep(900);
        const p = payload(items, customer);
        const id = 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        return {
          ok: true,
          orderId: id,
          total: p.estimatedTotal,
          message: `Simulierte Bestellung ${id}: ${p.items.length} Artikel, ca. ${KA.fmtEUR(p.estimatedTotal)}. Es wurde nichts wirklich bestellt.`,
          raw: p,
        };
      },
    },

    rest: {
      label: 'Eigener REST-Endpunkt (Shop-API / Webhook)',
      help:
        'Sendet die Einkaufsliste als JSON per HTTP an eine beliebige API (z. B. eigener Shop-Adapter, Zapier/Make-Webhook). ' +
        'Browser blockieren fremde Server oft per CORS – dann „Über lokalen Proxy“ aktivieren (start.bat / node server.js).',
      fields: [
        { k: 'url', label: 'Endpunkt-URL', placeholder: 'https://api.example.com/v1/orders', type: 'url' },
        { k: 'method', label: 'Methode', type: 'select', options: ['POST', 'PUT'] },
        { k: 'authHeader', label: 'Auth-Header-Name', placeholder: 'Authorization' },
        { k: 'authValue', label: 'Auth-Wert / API-Key', placeholder: 'Bearer sk-…', type: 'password' },
        { k: 'viaProxy', label: 'Über lokalen Proxy senden (umgeht CORS, Key bleibt serverseitig möglich)', type: 'checkbox' },
      ],
      preview: (items, cfg, customer) => ({
        request: {
          method: cfg.method || 'POST',
          url: cfg.url || '(URL fehlt)',
          headers: Object.assign({ 'Content-Type': 'application/json' }, cfg.authHeader && cfg.authValue ? { [cfg.authHeader]: '••••••' } : {}),
        },
        body: payload(items, customer),
      }),
      async submit(items, cfg, customer) {
        if (!cfg.url) throw new Error('Bitte zuerst eine Endpunkt-URL eintragen.');
        const body = payload(items, customer);
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.authHeader && cfg.authValue) headers[cfg.authHeader] = cfg.authValue;
        let res;
        try {
          // In der Desktop-App (Kochapp.exe) sendet immer die App-Hülle – dort gibt es kein CORS.
          if (cfg.viaProxy || root.KA_DESKTOP) {
            res = await fetch('/api/order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: cfg.url, method: cfg.method || 'POST', headers, payload: body }),
            });
          } else {
            res = await fetch(cfg.url, { method: cfg.method || 'POST', headers, body: JSON.stringify(body) });
          }
        } catch (e) {
          throw new Error('Anfrage fehlgeschlagen (' + e.message + '). Häufige Ursache: CORS – Option „Über lokalen Proxy“ nutzen.');
        }
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch (e) { /* kein JSON */ }
        if (!res.ok) throw new Error(`Server antwortete mit ${res.status}: ${text.slice(0, 300)}`);
        return {
          ok: true,
          orderId: json && (json.orderId || json.id),
          message: `Bestellung übermittelt (HTTP ${res.status}).` + (json && (json.orderId || json.id) ? ' Referenz: ' + (json.orderId || json.id) : ''),
          raw: json || text,
        };
      },
    },

    mailto: {
      label: 'Per E-Mail an Händler / Lieferdienst',
      help: 'Öffnet dein E-Mail-Programm mit der fertigen Bestellliste – für Hofläden, Wochenmarkt oder Lieferdienste ohne API.',
      fields: [{ k: 'to', label: 'Empfänger', placeholder: 'bestellung@hofladen.de', type: 'email' }],
      preview: (items, cfg, customer) => ({ to: cfg.to || '(Empfänger fehlt)', subject: 'Bestellung', body: KA.listToText(items, customer) }),
      async submit(items, cfg, customer) {
        const text = KA.listToText(items, customer);
        location.href = 'mailto:' + encodeURIComponent(cfg.to || '') + '?subject=' + encodeURIComponent('Bestellung') + '&body=' + encodeURIComponent(text);
        return { ok: true, message: 'E-Mail-Programm geöffnet. Bitte dort noch absenden.' };
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
