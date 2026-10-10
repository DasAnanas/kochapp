import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe, publicURL, fetchRecipe, importEndpoint } from './import-recipe.mjs';
const page = recipe => `<script type="application/ld+json">${JSON.stringify(recipe)}</script>`;
const recipe = { '@type': 'Recipe', name: 'Testbrot &amp; Nüsse', recipeIngredient: ['200 g Mehl', '2 Eier'], recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ '@type': 'HowToStep', text: 'Alles <b>mischen</b>.' }, { text: 'Backen.' }] }], totalTime: 'PT1H15M', recipeYield: ['12', '12 Stück'], recipeCategory: 'Backen' };
test('liest verschachtelte JSON-LD-Rezepte mit Mengen, Portionen und Dauer', () => {
  const data = parseRecipe(page({ '@graph': [recipe] }), 'https://example.com/brot');
  assert.equal(data.title, 'Testbrot & Nüsse');
  assert.equal(data.serv, 12); assert.equal(data.time, 75); assert.equal(data.cat, 'Backen');
  assert.deepEqual(data.ingredients, ['200 g Mehl', '2 Eier']);
  assert.deepEqual(data.steps, ['Alles mischen .', 'Backen.']);
  assert.equal(data.sourceUrl, 'https://example.com/brot');
});
test('überspringt defekte Blöcke und unterstützt Rezept-Typarrays', () => {
  const data = parseRecipe('<script type="application/ld+json">bad</script>'+page([{ ...recipe, '@type': ['Thing','Recipe'], recipeInstructions: 'Mischen.\nBacken.' }]), 'https://example.com');
  assert.deepEqual(data.steps, ['Mischen.', 'Backen.']);
});
test('weist fehlende und unvollständige Rezepte zurück', () => {
  assert.throws(() => parseRecipe('<html></html>','https://example.com'), /keine strukturierten/);
  assert.throws(() => parseRecipe(page({...recipe,recipeInstructions:[]}), 'https://example.com'), /unvollständig/);
});
test('blockiert interne Adressen, IPs, Credentials und fremde Protokolle', () => {
  for (const url of ['file:///etc/passwd','http://127.0.0.1','http://2130706433','http://0x7f000001','http://[::1]','http://localhost','http://foo.internal','https://example.com:8080','https://user:pass@example.com']) assert.throws(() => publicURL(url), undefined, url);
});
test('prüft auch Weiterleitungsziele', async () => {
  await assert.rejects(fetchRecipe('https://example.com',async () => new Response(null,{status:302,headers:{location:'http://127.0.0.1'}})), /öffentlichen/);
});
test('liefert verständliche Abruffehler und begrenzt Dateigrößen', async () => {
  await assert.rejects(fetchRecipe('https://example.com', async () => new Response('',{status:403})), /HTTP 403/);
  await assert.rejects(fetchRecipe('https://example.com', async () => new Response('',{headers:{'content-type':'text/html','content-length':'99999999'}})), /zu groß/);
  const result = await fetchRecipe('https://example.com',async () => new Response(page(recipe),{headers:{'content-type':'text/html'}}));
  assert.equal(result.serv,12);
});
test('fremde Origins und fehlerhafte Anfragen werden nicht abgerufen', async () => {
  assert.equal((await importEndpoint(new Request('https://kochapp.example/api/import-recipe',{method:'POST',headers:{origin:'https://fremd.example'},body:'{}'}))).status,403);
  assert.equal((await importEndpoint(new Request('https://kochapp.example/api/import-recipe',{method:'POST',body:'bad'}))).status,422);
});

test('öffentlicher Importdienst erlaubt Preflight für lokale HTML-Dateien', async () => {
  const request = new Request('https://kochapp.example/api/import-recipe', {method:'OPTIONS',headers:{origin:'null','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
  const response = await importEndpoint(request, {allowFileOrigin:true});
  assert.equal(response.status,204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'null');
  assert.equal(response.headers.get('Access-Control-Allow-Headers'),'Content-Type');
  assert.equal((await importEndpoint(request)).status,403);
});
test('lokale Dateien erhalten auch lesbare Importfehler, fremde Websites bleiben gesperrt', async () => {
  const response = await importEndpoint(new Request('https://kochapp.example/api/import-recipe',{method:'POST',headers:{origin:'null'},body:'bad'}),{allowFileOrigin:true});
  assert.equal(response.status,422);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'null');
  assert.equal((await response.json()).error,'Ungültige Anfrage.');
  const denied = await importEndpoint(new Request('https://kochapp.example/api/import-recipe',{method:'OPTIONS',headers:{origin:'https://fremd.example'}}),{allowFileOrigin:true});
  assert.equal(denied.status,403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
});
