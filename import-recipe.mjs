// Importiert öffentlich zugängliche Rezeptseiten mit schema.org-Rezeptdaten.
const MAX_BYTES = 3 * 1024 * 1024;
const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß' };
function decode(text) {
  return String(text ?? '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, code) => {
    if (code[0] !== '#') return entities[code] ?? all;
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  });
}
function clean(value) {
  return decode(String(value ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
export function publicURL(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Bitte einen vollständigen https://-Link eingeben.'); }
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port)) || !host.includes('.') || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) || /(^|\.)(localhost|local|internal|test|invalid|onion|home|lan)$/.test(host)) {
    throw new Error('Bitte einen Link zu einer öffentlichen Rezeptwebsite verwenden.');
  }
  url.hash = '';
  return url;
}
function minutes(value) {
  const m = String(value ?? '').match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  return m ? Math.ceil(Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) + Number(m[4] || 0) / 60) : 0;
}
function steps(value) {
  if (Array.isArray(value)) return value.flatMap(steps);
  if (typeof value === 'string') return value.split(/(?:\r?\n)+|<br\s*\/?>|<\/p>/i).map(clean).filter(Boolean);
  if (value && typeof value === 'object') return value.itemListElement ? steps(value.itemListElement) : steps(value.text || value.description || '');
  return [];
}
export function parseRecipe(html, sourceURL) {
  const nodes = [];
  const walk = (value, depth = 0) => {
    if (depth > 30 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(x => walk(x, depth + 1)); return; }
    nodes.push(value);
    Object.values(value).forEach(x => walk(x, depth + 1));
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\btype\s*=\s*["']application\/ld\+json(?:\s*;[^"']*)?["']/i.test(match[1])) continue;
    const data = match[2].trim().replace(/^<!--|-->$/g, '');
    try { walk(JSON.parse(data)); } catch { try { walk(JSON.parse(decode(data))); } catch { /* Andere Blöcke weiter prüfen. */ } }
  }
  const recipes = nodes.filter(n => [n['@type']].flat().some(t => /(?:^|[\/#])Recipe$/.test(String(t))));
  const recipe = recipes.find(r => r.name && r.recipeIngredient?.length && r.recipeInstructions) || recipes[0];
  if (!recipe) throw new Error('Auf dieser Seite wurden keine strukturierten Rezeptdaten gefunden. Bitte das Rezept manuell eintragen oder einen anderen Rezeptlink versuchen.');
  const title = clean(recipe.name).slice(0, 300);
  const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [recipe.recipeIngredient]).map(clean).filter(Boolean).slice(0, 200);
  const instructions = steps(recipe.recipeInstructions).slice(0, 100);
  if (!title || !ingredients.length || !instructions.length) throw new Error('Das Rezept ist unvollständig: Titel, Zutaten oder Zubereitung fehlen. Bitte manuell eintragen.');
  const yieldText = clean([recipe.recipeYield].flat().join(' '));
  const serv = Number(yieldText.match(/\d+(?:[.,]\d+)?/)?.[0].replace(',', '.')) || 1;
  const time = minutes(recipe.totalTime) || minutes(recipe.prepTime) + minutes(recipe.cookTime);
  const categories = clean([recipe.recipeCategory, recipe.keywords].flat().join(' '));
  const cat = /back|bread|brot|kuchen|cake|gebäck|dessert/i.test(categories + ' ' + title) ? 'Backen' : /frühstück|breakfast/i.test(categories) ? 'Frühstück' : /snack/i.test(categories) ? 'Snack' : 'Hauptgericht';
  const url = new URL(sourceURL);
  return { title, ingredients, steps: instructions, serv: Math.max(1, Math.min(1000, serv)), yieldText, time, cat, source: 'Web', domain: url.hostname, sourceUrl: url.href };
}
export async function fetchRecipe(value, fetcher = fetch) {
  let url = publicURL(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    for (let redirects = 0; redirects <= 4; redirects++) {
      const response = await fetcher(url.href, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'KochappRecipeImporter/1.0' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new Error('Die Website liefert eine ungültige Weiterleitung.');
        url = publicURL(new URL(location, url).href); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Die Website erlaubt den Abruf nicht (HTTP ${response.status}). Bitte einen anderen Link versuchen oder das Rezept manuell eintragen.`); }
      if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) { await response.body?.cancel(); throw new Error('Der Link führt nicht zu einer Rezept-Webseite.'); }
      if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new Error('Die Rezeptseite ist zu groß für den Import.'); }
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Die Rezeptseite ist zu groß für den Import.'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return parseRecipe(new TextDecoder().decode(bytes), url.href);
    }
    throw new Error('Die Website leitet zu oft weiter.');
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Die Website antwortet zu langsam. Bitte später erneut versuchen.');
    if (error instanceof TypeError) throw new Error('Die Website konnte nicht erreicht werden. Bitte später erneut versuchen oder einen anderen Rezeptlink verwenden.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function importEndpoint(request, { allowFileOrigin = false } = {}) {
  const own = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  // Nur der öffentliche Online-Dienst erlaubt lokale HTML-Dateien (Origin null).
  const fromFile = allowFileOrigin && origin === 'null';
  if (origin && origin !== own && !fromFile) return Response.json({error:'Anfrage nicht erlaubt.'},{status:403});
  const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (fromFile) {
    headers['Access-Control-Allow-Origin'] = 'null';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  const json = (body, status = 200) => Response.json(body, { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({error:'Bitte POST verwenden.'},405);
  try {
    const body = await request.text();
    if (body.length > 4096) return json({error:'Der Link ist zu lang.'},400);
    const input = JSON.parse(body);
    if (typeof input.url !== 'string') throw new Error('Bitte einen Rezeptlink eingeben.');
    const recipe = await fetchRecipe(input.url);
    return json({recipe});
  } catch (error) {
    return json({error:error instanceof SyntaxError ? 'Ungültige Anfrage.' : error.message || 'Der Import ist fehlgeschlagen.'},422);
  }
}
