/* Kochapp – optionaler lokaler Server (ohne Abhängigkeiten, nur Node.js)
 *   node server.js            -> http://localhost:8080
 *
 * Aufgaben:
 *  1. liefert die App aus
 *  2. POST /api/order: leitet Bestellungen an eine externe Shop-API weiter (umgeht CORS)
 *
 * Sicherheit: Nur auf 127.0.0.1 erreichbar. Wer den API-Key nicht im Browser speichern will,
 * setzt Umgebungsvariablen – dann werden Ziel und Key ausschließlich serverseitig verwendet:
 *   ORDER_API_URL=https://api.dein-shop.de/v1/orders
 *   ORDER_API_KEY="Bearer geheim"           (optional)
 *   ORDER_API_KEY_HEADER=Authorization      (optional, Standard: Authorization)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('zu groß')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const send = (res, code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };

async function handleOrder(req, res) {
  // Nur Anfragen von der eigenen Seite zulassen (Schutz gegen fremde Webseiten)
  const origin = req.headers.origin;
  if (origin && origin !== `http://localhost:${PORT}` && origin !== `http://127.0.0.1:${PORT}`) return send(res, 403, { error: 'Origin nicht erlaubt' });
  let data;
  try { data = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: 'Ungültiges JSON' }); }
  const target = process.env.ORDER_API_URL || data.target;
  if (!/^https?:\/\//i.test(target || '')) return send(res, 400, { error: 'Ungültige Ziel-URL' });
  const headers = Object.assign({ 'Content-Type': 'application/json' }, process.env.ORDER_API_URL ? {} : data.headers || {});
  if (process.env.ORDER_API_KEY) headers[process.env.ORDER_API_KEY_HEADER || 'Authorization'] = process.env.ORDER_API_KEY;
  try {
    const r = await fetch(target, { method: data.method === 'PUT' ? 'PUT' : 'POST', headers, body: JSON.stringify(data.payload) });
    const text = await r.text();
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'text/plain' });
    res.end(text);
  } catch (e) {
    send(res, 502, { error: 'Ziel nicht erreichbar: ' + e.message });
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/import-recipe') {
    try {
      const { importEndpoint } = await import('./import-recipe.mjs');
      const body = req.method === 'POST' ? await readBody(req, 4096) : undefined;
      const request = new Request(`http://${req.headers.host || 'localhost:' + PORT}${req.url}`, {
        method: req.method, headers: req.headers, ...(body ? { body } : {})
      });
      const response = await importEndpoint(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      return send(res, 400, { error: 'Ungültige Import-Anfrage.' });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/order') return handleOrder(req, res);
  if (req.method !== 'GET') return send(res, 405, { error: 'Methode nicht erlaubt' });
  let file = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT) || /server\.js$/.test(file)) return send(res, 403, 'Verboten', 'text/plain');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Nicht gefunden', 'text/plain');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Kochapp läuft auf http://localhost:${PORT}  (Strg+C zum Beenden)`));
