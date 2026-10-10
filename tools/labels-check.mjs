// Prüft die Labels aller mitgelieferten Rezepte: node tools/labels-check.mjs
// - jedes Rezept hat eine Küche aus KA.KUECHEN, jedes Rezeptbuch-Rezept eine Schwierigkeit
// - jede Zutat ist entweder mit den Lebensmitteldaten verknüpft oder in der Zutaten-Tabelle (rezepte.js) erfasst
// - mit --liste: Labels je Rezept ausgeben (zum Gegenlesen)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'rezepte.js', 'logic.js']) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
const KA = ctx.KA;

// Zutaten-Erkennung aus app.js übernehmen (parseLine … linkIng), damit genau wie in der App verknüpft wird
const app = readFileSync(join(root, 'app.js'), 'utf8');
const from = app.indexOf('  function parseLine(');
const to = app.indexOf('  const hash = ');
if (from < 0 || to < from) throw new Error('parseLine/linkIng in app.js nicht gefunden – Prüfskript anpassen.');
vm.runInContext(`(function () { const { ING } = KA; ${app.slice(from, to)}; KA._linkLine = (t) => linkIng(parseLine(t)); })();`, ctx);

const errors = [];
const used = new Set();
const ids = new Set();

KA.RECIPES.forEach((r) => ids.add(r.id));
KA.BOOK.forEach((b) => ids.add(b.id.slice(2)));
for (const id of ids) if (!KA.KUECHE_VON[id]) errors.push(`Keine Küche: ${id}`);
for (const [id, k] of Object.entries(KA.KUECHE_VON)) {
  if (!ids.has(id)) errors.push(`Küche für unbekanntes Rezept: ${id}`);
  if (!KA.KUECHEN.includes(k)) errors.push(`Küche „${k}“ fehlt in KA.KUECHEN (${id})`);
}
for (const id of Object.keys(KA.DIFF_VON)) if (!KA.BOOK.some((b) => b.id === 'b-' + id)) errors.push(`Schwierigkeit für unbekanntes Rezept: ${id}`);

const book = KA.BOOK.map((b) => {
  const ings = b.ings.map((t) => KA._linkLine(t));
  ings.forEach((p) => {
    const key = KA.zutatKey(p.name);
    if (KA.ZUTAT_FLAGS[key]) used.add(key);
    else if (!p.id) errors.push(`Zutat ohne Inhaltsstoffe: „${p.name}“ in ${b.title}`);
  });
  return { id: b.id, title: b.title, cat: b.cat, cuisine: b.cuisine, diff: b.diff, time: b.time, serv: b.serv, steps: b.steps, ings };
});
for (const key of Object.keys(KA.ZUTAT_FLAGS)) if (!used.has(key)) console.warn(`Hinweis: Tabelleneintrag „${key}“ wird von keinem Rezept benutzt.`);

// Labels wie in der App berechnen
KA.setBookRecipes(book);
const flagsOf = (r) => KA.recipeFlags(r);
const diet = (f) => {
  if (f.has('unbekannt')) return 'unvollständig';
  const meat = f.has('fleisch') || f.has('gelatine');
  if (!meat && !f.has('fisch') && !f.has('schalentier')) return !f.has('milch') && !f.has('ei') && !f.has('honig') ? 'vegan' : 'vegetarisch';
  return meat ? 'mit Fleisch' : 'pescetarisch';
};
const count = {};
KA.RECIPES.forEach((r) => {
  const f = flagsOf(r);
  const d = diet(f);
  count[d] = (count[d] || 0) + 1;
  if (d === 'unvollständig') errors.push(`Labels unvollständig: ${r.name}`);
  if (process.argv.includes('--liste')) {
    const extra = ['gluten', 'milch', 'ei', 'nuss', 'erdnuss', 'soja', 'sesam', 'schwein', 'alkohol', 'gelatine'].filter((x) => f.has(x));
    console.log(`${r.k.padEnd(14)} ${d.padEnd(12)} ${r.name}${extra.length ? '  [' + extra.join(', ') + ']' : ''}`);
  }
});

console.log(`${KA.RECIPES.length} Rezepte geprüft:`, Object.entries(count).map(([k, v]) => `${v} ${k}`).join(', '));
const perCuisine = {};
KA.RECIPES.forEach((r) => (perCuisine[r.k] = (perCuisine[r.k] || 0) + 1));
console.log('Küchen:', KA.KUECHEN.filter((k) => perCuisine[k]).map((k) => `${k} ${perCuisine[k]}`).join(', '));
if (errors.length) {
  console.error(`\n${errors.length} Fehler:\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('Alles in Ordnung.');
