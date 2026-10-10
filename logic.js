/* dAIlykitchen – Logik (ohne DOM): Nährwerte, Filter, Rezept-Finder, Wochenplaner, Einkaufsliste */
(function (root) {
  const KA = (root.KA = root.KA || {});
  const { NUTRIENTS, ING, RECIPES, DIETS, MEALS, CATS } = KA;
  const NK = NUTRIENTS.map((n) => n.k);
  const IDX = {};
  NK.forEach((k, i) => (IDX[k] = i));
  KA.IDX = IDX;
  const REC = {};
  RECIPES.forEach((r) => (REC[r.id] = r));
  KA.REC = REC;
  // Kategorie und Küche der mitgelieferten Rezepte (Zuordnung in rezepte.js)
  const catOfTypes = (t) => (t.includes('m') || t.includes('a') ? 'Hauptgericht' : t.includes('f') ? 'Frühstück' : 'Snack');
  RECIPES.forEach((r) => {
    r.cat = ((KA.BUILTIN_META || {})[r.id] || {}).cat || catOfTypes(r.types);
    r.k = (KA.KUECHE_VON || {})[r.id] || 'International';
  });

  /* ---------- Hilfsfunktionen ---------- */
  KA.norm = (s) =>
    String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  KA.toBase = (amount, unit) => {
    const a = Number(amount) || 0;
    if (unit === 'kg' || unit === 'l') return a * 1000;
    return a;
  };

  const de = (x, d) => x.toLocaleString('de-DE', { maximumFractionDigits: d == null ? 1 : d });
  KA.fmtNum = de;
  KA.fmtAmount = (id, base) => {
    const u = ING[id].unit;
    if (u === 'Stk') return de(Math.round(base * 100) / 100, 2) + ' Stk';
    if (base >= 1000) return de(base / 1000, 2) + (u === 'g' ? ' kg' : ' l');
    return de(Math.round(base * 10) / 10, 1) + ' ' + u;
  };
  KA.fmtEUR = (x) => x.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  KA.price = (id, base) => {
    const i = ING[id];
    return i.unit === 'Stk' ? base * i.price : (base / 1000) * i.price;
  };

  /* ---------- Nährwerte ---------- */
  const vecScale = (v, f) => v.map((x) => x * f);
  const vecAdd = (a, b) => a.map((x, i) => x + b[i]);
  const zero = () => NK.map(() => 0);
  KA.zero = zero;

  KA.ingNutr = (id, base) => {
    const i = ING[id];
    const grams = i.unit === 'Stk' ? base * i.gpu : base;
    return vecScale(i.n, grams / 100);
  };

  const perServCache = {};
  KA.recipeNutr = (r) => {
    // Nährwerte pro Portion
    if (!perServCache[r.id]) {
      let v = zero();
      r.i.forEach(([id, a]) => (v = vecAdd(v, KA.ingNutr(id, a))));
      perServCache[r.id] = vecScale(v, 1 / r.s);
    }
    return perServCache[r.id];
  };
  KA.recipeCost = (r) => r.i.reduce((s, [id, a]) => s + KA.price(id, a), 0) / r.s;

  const flagCache = {};
  KA.recipeFlags = (r) => {
    if (!flagCache[r.id]) {
      const s = new Set();
      r.i.forEach(([id]) => ING[id].flags.forEach((f) => s.add(f)));
      // Rezeptbuch- und eigene Rezepte: Zutaten ohne umrechenbare Menge zählen für die Inhaltsstoffe mit. Die Tabelle
      // in rezepte.js ergänzt Zutaten, die nicht in den Lebensmitteldaten stehen (oder dort zu grob erfasst sind);
      // fehlen sie in beiden, sind die Inhaltsstoffe nicht prüfbar.
      (r.free || []).forEach((x) => {
        if (x.id && ING[x.id]) ING[x.id].flags.forEach((f) => s.add(f));
        else if (!(KA.zutatFlags && KA.zutatFlags(x.name))) s.add('unbekannt');
      });
      (r.names || []).forEach((n) => ((KA.zutatFlags && KA.zutatFlags(n)) || []).forEach((f) => s.add(f)));
      flagCache[r.id] = s;
    }
    return flagCache[r.id];
  };

  /* ---------- Eigene und Rezeptbuch-Rezepte für Finder und Wochenplan ---------- */
  const TYPES_BY_CAT = { 'Frühstück': ['f'], 'Hauptgericht': ['m', 'a'], 'Snack': ['s'], 'Backen': ['s'], 'Nachtisch': ['s'], 'Getränke': ['s'] };
  // Übernimmt Rezepte im Format des Rezeptbuchs in den Rezeptbestand. Die Nährwerte ergeben sich aus den Zutaten, die mit den
  // Stammdaten verknüpft sind (id + base = Menge in der Grundeinheit des Lebensmittels); die übrigen stehen in r.free, dann
  // sind die Nährwerte unvollständig (r.partial). kind: 'user' (eigene, nur mit mindestens einer verknüpften Zutat) oder
  // 'book' (mitgelieferte Rezeptbuch-Rezepte; nur im Finder, nicht im Wochenplan, weil ihre Nährwerte meist unvollständig sind).
  function setRecipes(list, kind) {
    for (let k = RECIPES.length - 1; k >= 0; k--) {
      if (!RECIPES[k][kind]) continue;
      const id = RECIPES[k].id;
      RECIPES.splice(k, 1);
      delete REC[id]; delete perServCache[id]; delete flagCache[id];
    }
    let n = 0;
    (list || []).forEach((u) => {
      const linked = (x) => x.id && ING[x.id] && x.base > 0;
      const sum = {};
      (u.ings || []).filter(linked).forEach((x) => (sum[x.id] = (sum[x.id] || 0) + x.base));
      if ((kind === 'user' && !Object.keys(sum).length) || REC[u.id]) return;
      const free = (u.ings || []).filter((x) => !linked(x));
      const r = {
        id: u.id, name: u.title, types: TYPES_BY_CAT[u.cat] || ['m', 'a'], cat: u.cat || 'Hauptgericht', k: u.cuisine || 'International',
        time: u.time || 30, diff: u.diff || 2, s: u.serv || 1, i: Object.keys(sum).map((id) => [id, sum[id]]), st: u.steps || [],
        free, partial: free.length > 0, names: (u.ings || []).map((x) => x.name),
      };
      r[kind] = true;
      RECIPES.push(r);
      REC[r.id] = r;
      n++;
    });
    return n;
  }
  KA.setUserRecipes = (list) => setRecipes(list, 'user');
  KA.setBookRecipes = (list) => setRecipes(list, 'book');

  /* ---------- Präferenzen / Filter ---------- */
  KA.recipeMatches = (r, prefs, slot) => {
    if (slot && !r.types.includes(slot)) return false;
    if (prefs.onlyMine && !r.user) return false;
    if (prefs.maxTime && r.time > prefs.maxTime) return false;
    if (prefs.maxDiff && r.diff > prefs.maxDiff) return false;
    if (prefs.cuisines && prefs.cuisines.length && !prefs.cuisines.includes(r.k || 'International')) return false;
    const flags = KA.recipeFlags(r);
    const n = KA.recipeNutr(r);
    const kcal = n[IDX.kcal] || 1;
    for (const d of prefs.diets || []) {
      const def = DIETS[d];
      if (!def) continue;
      // unbekannte Zutaten könnten gegen die Ernährungsform verstoßen -> vorsichtshalber ausschließen
      if (def.excl && (flags.has('unbekannt') || def.excl.some((f) => flags.has(f)))) return false;
      // Nährwert-Formen lassen sich nur mit vollständigen Nährwerten zusichern
      if (def.macro && r.partial) return false;
      if (def.macro === 'lowcarb' && (n[IDX.carb] * 4) / kcal > 0.3) return false;
      if (def.macro === 'highprotein' && (n[IDX.prot] * 4) / kcal < 0.22) return false;
    }
    const dis = (prefs.dislikes || []).map(KA.norm).filter(Boolean);
    if (dis.length) {
      const hay = [KA.norm(r.name)].concat(r.i.map(([id]) => KA.norm(ING[id].name) + ' ' + id), (r.free || []).map((x) => KA.norm(x.name)));
      if (dis.some((d) => hay.some((h) => h.includes(d)))) return false;
    }
    return true;
  };

  /* ---------- Nährstoffziele ---------- */
  const ACT = { 1.4: 'Überwiegend sitzend', 1.6: 'Leicht aktiv', 1.75: 'Moderat aktiv', 1.9: 'Sehr aktiv', 2.1: 'Extrem aktiv' };
  KA.ACTIVITY = ACT;

  KA.bodyValid = (b) => b && b.enabled && b.age > 0 && b.height > 0 && b.weight > 0;

  KA.targets = (prefs) => {
    const b = prefs.body;
    const T = {};
    let kcal, prot, sexMale = true, known = false;
    if (KA.bodyValid(b)) {
      known = true;
      sexMale = b.sex !== 'f';
      const bmr = 10 * b.weight + 6.25 * b.height - 5 * b.age + (sexMale ? 5 : -161);
      kcal = bmr * (Number(b.activity) || 1.6);
      if (b.goal === 'lose') kcal *= 0.85;
      if (b.goal === 'gain') kcal *= 1.1;
      prot = b.weight * (b.goal === 'gain' ? 1.8 : b.goal === 'lose' ? 1.6 : 1.3);
      T.bmr = bmr;
    } else {
      kcal = 2000;
      prot = 70;
    }
    kcal = Math.round(kcal / 10) * 10;
    const mc = prefs.macro;
    const custom = !!(mc && mc.enabled && mc.p + mc.c + mc.f === 100);
    if (custom) prot = (kcal * mc.p) / 400;
    const fat = custom ? (kcal * mc.f) / 900 : (kcal * 0.3) / 9;
    const carb = custom ? (kcal * mc.c) / 400 : Math.max(0, (kcal - prot * 4 - fat * 9) / 4);
    const age = known ? b.age : 30;
    const m = known ? sexMale : null; // null = Mittelwert
    const pick = (male, female) => (m === null ? (male + female) / 2 : m ? male : female);
    Object.assign(T, {
      kcal, prot: Math.round(prot), carb: Math.round(carb), fat: Math.round(fat),
      fiber: Math.max(30, Math.round((kcal / 1000) * 14)),
      vitC: pick(110, 95), vitA: pick(850, 700), vitD: 20, b12: 4, folat: 300, ca: 1000,
      fe: pick(10, age < 51 ? 15 : 10), mg: pick(350, 300), zn: pick(11, 8), k: 4000,
      known, custom,
    });
    return T;
  };
  KA.targetVec = (T) => NK.map((k) => T[k]);

  /* ---------- Rundung / Einkaufsmengen ---------- */
  KA.buyAmount = (id, a) => {
    if (a <= 1e-6) return 0;
    if (ING[id].unit === 'Stk') return Math.ceil(a - 1e-6);
    if (a <= 50) return Math.ceil(a / 5) * 5;
    if (a <= 500) return Math.ceil(a / 25) * 25;
    return Math.ceil(a / 50) * 50;
  };

  // needMap {id: baseAmount} -> sortierte Einkaufsliste
  KA.buildList = (needMap, prefs) => {
    const items = [];
    Object.keys(needMap).forEach((id) => {
      const ing = ING[id];
      if (!ing) return;
      if (prefs && prefs.assumeStaples && ing.staple) return;
      const amount = KA.buyAmount(id, needMap[id]);
      if (amount <= 0) return;
      items.push({ id, name: ing.name, cat: ing.cat, amount, unit: ing.unit, price: KA.price(id, amount), checked: true });
    });
    const order = Object.keys(CATS);
    items.sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || a.name.localeCompare(b.name, 'de'));
    return items;
  };

  /* ---------- Rezept-Finder ---------- */
  KA.evalRecipe = (r, pantry, servings, prefs) => {
    const k = servings / r.s;
    const used = {};
    const lines = [];
    let csum = 0, cnt = 0;
    r.i.forEach(([id, amt]) => {
      const need = amt * k;
      const ing = ING[id];
      const have = pantry[id] || 0;
      const u = Math.min(have, need);
      const basic = prefs.assumeStaples && ing.staple;
      if (!basic) {
        used[id] = u;
        csum += u / need;
        cnt++;
      }
      lines.push({ id, need, have, used: u, missing: basic ? 0 : Math.max(0, need - u), basic });
    });
    const cover = cnt ? csum / cnt : 1;
    const pIds = Object.keys(pantry).filter((id) => pantry[id] > 0 && !(prefs.assumeStaples && ING[id] && ING[id].staple));
    let useFrac = 0, touched = 0;
    pIds.forEach((id) => {
      const u = used[id] || 0;
      if (u > 0) {
        touched++;
        useFrac += Math.min(1, u / pantry[id]);
      }
    });
    const n = pIds.length || 1;
    const score = 0.45 * (useFrac / n) + 0.35 * cover + 0.2 * (touched / n);
    return { r, score, cover, touched, pantryCount: pIds.length, useFrac: useFrac / n, used, lines, servings };
  };

  KA.findRecipes = (pantry, prefs) => {
    const list = RECIPES.filter((r) => KA.recipeMatches(r, prefs))
      .map((r) => KA.evalRecipe(r, pantry, prefs.persons || 2, prefs))
      .filter((e) => e.touched > 0);
    list.sort((a, b) => b.score - a.score);
    return list;
  };

  // Greedy: mehrere Rezepte, die zusammen möglichst viel vom Vorrat verbrauchen
  KA.bestCombo = (pantry, prefs, count) => {
    let rest = Object.assign({}, pantry);
    const chosen = [];
    const pool = RECIPES.filter((r) => KA.recipeMatches(r, prefs));
    for (let n = 0; n < count; n++) {
      let best = null;
      pool.forEach((r) => {
        if (chosen.includes(r.id)) return;
        const e = KA.evalRecipe(r, rest, prefs.persons || 2, prefs);
        if (e.touched > 0 && (!best || e.score > best.score)) best = e;
      });
      if (!best || best.score < 0.03) break;
      chosen.push(best.r.id);
      Object.keys(best.used).forEach((id) => (rest[id] = Math.max(0, (rest[id] || 0) - best.used[id])));
    }
    return chosen;
  };

  // Welcher Anteil des Vorrats wird durch die Auswahl verbraucht
  KA.pantryUsage = (ids, pantry, prefs) => {
    let rest = Object.assign({}, pantry);
    const total = {};
    ids.forEach((rid) => {
      const e = KA.evalRecipe(REC[rid], rest, prefs.persons || 2, prefs);
      Object.keys(e.used).forEach((id) => {
        total[id] = (total[id] || 0) + e.used[id];
        rest[id] = Math.max(0, (rest[id] || 0) - e.used[id]);
      });
    });
    const pIds = Object.keys(pantry).filter((id) => pantry[id] > 0 && !(prefs.assumeStaples && ING[id].staple));
    const touched = pIds.filter((id) => total[id] > 0).length;
    const mass = pIds.reduce((s, id) => s + Math.min(1, (total[id] || 0) / pantry[id]), 0);
    return { touched, count: pIds.length, massFrac: pIds.length ? mass / pIds.length : 0 };
  };

  // Einkaufsliste für Rezeptauswahl (Vorrat wird nacheinander aufgebraucht)
  KA.shoppingForRecipes = (ids, pantry, prefs) => {
    const rest = Object.assign({}, pantry);
    const need = {};
    ids.forEach((rid) => {
      const e = KA.evalRecipe(REC[rid], rest, prefs.persons || 2, prefs);
      e.lines.forEach((l) => {
        if (l.missing > 0) need[l.id] = (need[l.id] || 0) + l.missing;
      });
      Object.keys(e.used).forEach((id) => (rest[id] = Math.max(0, (rest[id] || 0) - e.used[id])));
    });
    return KA.buildList(need, prefs);
  };

  KA.cookRecipe = (rid, pantry, prefs) => {
    const e = KA.evalRecipe(REC[rid], pantry, prefs.persons || 2, prefs);
    const next = Object.assign({}, pantry);
    Object.keys(e.used).forEach((id) => {
      next[id] = Math.max(0, (next[id] || 0) - e.used[id]);
      if (next[id] < 1e-6) delete next[id];
    });
    return next;
  };

  /* Neue Vorschläge aus kombinierbaren Vorratszutaten; keine externen Dienste. */
  let generatedId = 0;
  KA.generatePantryRecipe = (pantry, prefs, variant = 0) => {
    const requested = Math.max(1, Math.min(30, Math.floor(Number(prefs.persons) || 2)));
    const allowed = (id) => {
      const ing = ING[id];
      return ing && pantry[id] > 0 && !(prefs.diets || []).some((d) =>
        DIETS[d] && DIETS[d].excl && DIETS[d].excl.some((f) => ing.flags.includes(f))) &&
        !(prefs.dislikes || []).map(KA.norm).filter(Boolean).some((d) => (KA.norm(ing.name) + ' ' + id).includes(d));
    };
    const pick = (ids, n = 1) => ids.filter(allowed).slice(0, n);
    const veg = pick(['zucchini', 'paprika', 'karotten', 'brokkoli', 'blumenkohl', 'champignons', 'spinat', 'lauch', 'tomaten'], 3);
    const fruit = pick(['bananen', 'aepfel', 'beeren'], 2);
    const protein = pick(['tofu', 'kichererbsen', 'kidneybohnen'], 1);
    const grams = (id, g) => ING[id].unit === 'Stk' ? g / ING[id].gpu : g;
    const names = (ids) => ids.map((id) => ING[id].name).join(', ');
    const candidates = [];
    function add(title, cat, time, required, optional, steps) {
      if (!required.length || required.some(([id]) => !allowed(id))) return;
      // Ganze Portionen, deren wesentliche Zutaten tatsächlich im Vorrat liegen.
      const serv = Math.min(requested, ...required.map(([id, qty]) => Math.floor((pantry[id] + 1e-8) / qty)));
      if (serv < 1) return;
      const i = required.map(([id, qty]) => [id, qty * serv]);
      optional.forEach(([id, qty]) => {
        if (!allowed(id) || i.some(([key]) => key === id)) return;
        const amount = Math.min(qty * serv, pantry[id]);
        if (amount >= qty * serv * 0.25) i.push([id, amount]);
      });
      // Einmalige Kennung, da Nährwerte und Flags pro Rezeptkennung gecacht werden.
      const r = { id: 'generated-' + (++generatedId), name: title, s: serv, time, diff: 1, i, user: true, types: ['m', 'a', 'f', 's'] };
      const matches = KA.recipeMatches(r, prefs);
      delete perServCache[r.id]; delete flagCache[r.id];
      if (!matches) return;
      candidates.push({ title, cat, time, serv, diff: 1, cuisine: '', image: '',
        ings: i.map(([id, qty]) => ({ name: ING[id].name, qty: Math.round(qty * 100) / 100, unit: ING[id].unit })),
        steps: steps(i.map(([id]) => id)), used: i.length });
      // Diese temporären Rezepte werden nicht im Bestand gehalten.
      delete perServCache[r.id]; delete flagCache[r.id];
    }
    const vegAmounts = veg.map((id) => [id, grams(id, 100)]);
    for (const base of pick(['nudeln', 'vollkornnudeln', 'reis', 'quinoa', 'couscous'], 5)) {
      if (!veg.length && !protein.length) continue;
      const main = veg.length ? [veg[0], grams(veg[0], 150)] : [protein[0], 150];
      add(ING[base].name + ' mit ' + ING[main[0]].name, 'Hauptgericht', 30,
        [[base, 80], main], [...vegAmounts, ...protein.map((id) => [id, 120])], (ids) => [
          ING[base].name + ' nach Packungsanweisung in Wasser garen.',
          veg.length ? names(veg.filter((id) => ids.includes(id))) + ' waschen, putzen und klein schneiden. Mit etwas Wasser in einer beschichteten Pfanne zugedeckt 10–15 Minuten garen, bis das Gemüse weich ist. Bei Bedarf Wasser nachgießen.' : 'Eine beschichtete Pfanne mit etwas Wasser erhitzen.',
          ...protein.filter((id) => ids.includes(id)).map((id) => id === 'tofu' ? 'Tofu würfeln und in der Pfanne mindestens 5 Minuten durcherhitzen.' : ING[id].name + ' abgießen, abspülen und 5 Minuten in der Pfanne durcherhitzen.'),
          'Die gegarte Beilage unterheben und warm servieren. Nach Wunsch mit vorhandenen Gewürzen abschmecken.'
        ]);
    }
    if (veg.length) {
      add('Vorrats-Gemüsepfanne mit ' + ING[veg[0]].name, 'Hauptgericht', 25,
        [[veg[0], grams(veg[0], 200)]], [...vegAmounts, ...protein.map((id) => [id, 150])], (ids) => [
          names(veg.filter((id) => ids.includes(id))) + ' waschen, putzen und in kleine Stücke schneiden.',
          'Gemüse mit etwas Wasser in eine beschichtete Pfanne geben. Zugedeckt 10–15 Minuten garen, bis es weich ist; gelegentlich umrühren und bei Bedarf Wasser nachgießen.',
          ...protein.filter((id) => ids.includes(id)).map((id) => id === 'tofu' ? 'Tofu würfeln, dazugeben und mindestens 5 Minuten durcherhitzen.' : ING[id].name + ' abgießen, abspülen, dazugeben und 5 Minuten durcherhitzen.'),
          'Warm servieren. Nach Wunsch mit vorhandenen Gewürzen abschmecken.'
        ]);
      add('Gemüse-Rührei mit ' + ING[veg[0]].name, 'Hauptgericht', 20,
        [['eier', 2], [veg[0], grams(veg[0], 100)]], vegAmounts, (ids) => [
          names(veg.filter((id) => ids.includes(id))) + ' waschen, putzen und klein schneiden.',
          'In einer beschichteten Pfanne mit wenig Wasser zugedeckt 10 Minuten weich garen. Überschüssiges Wasser verdampfen lassen.',
          'Eier in einer Schüssel verquirlen und zum Gemüse geben. Bei mittlerer Hitze unter Rühren vollständig stocken lassen, bis kein flüssiges Ei mehr zu sehen ist.',
          'Sofort servieren und nach Wunsch mit vorhandenen Gewürzen abschmecken.'
        ]);
    }
    if (fruit.length) {
      add('Haferbrei mit ' + names(fruit), 'Frühstück', 15,
        [['haferflocken', 60], [fruit[0], grams(fruit[0], 100)]], fruit.slice(1).map((id) => [id, grams(id, 80)]), (ids) => [
          'Haferflocken mit der dreifachen Menge Wasser aufkochen und unter Rühren 5–10 Minuten weich köcheln lassen.',
          names(fruit.filter((id) => ids.includes(id))) + ' vorbereiten: frisches Obst waschen oder schälen und klein schneiden. Tiefgekühlte Beeren zum Brei geben und mindestens 2 Minuten sprudelnd mitkochen.',
          'Frisches Obst unter den warmen Brei heben und servieren.'
        ]);
      for (const dairy of pick(['joghurt', 'skyr', 'quark'], 3)) {
        // TK-Beeren benötigen Erhitzen; deshalb hier nur frisches Obst verwenden.
        const fresh = fruit.filter((id) => id !== 'beeren');
        if (!fresh.length) continue;
        add(ING[dairy].name + ' mit ' + names(fresh), 'Frühstück', 10,
          [[dairy, 150], [fresh[0], grams(fresh[0], 100)]], fresh.slice(1).map((id) => [id, grams(id, 80)]), (ids) => [
            names(fresh.filter((id) => ids.includes(id))) + ' waschen oder schälen und klein schneiden.',
            ING[dairy].name + ' glatt rühren, Obst unterheben und servieren.'
          ]);
      }
    }
    candidates.sort((a, b) => b.used - a.used || b.serv - a.serv || a.time - b.time);
    if (!candidates.length) return { error: 'Aus deinem Vorrat lässt sich mit diesen Filtern noch kein passender Vorschlag erstellen. Ergänze zum Beispiel Gemüse mit Reis, Nudeln, Tofu oder Eiern – oder Obst mit Haferflocken bzw. Joghurt. Prüfe auch Mengen, Zeit und Ernährungsfilter.' };
    return { recipe: candidates[((variant % candidates.length) + candidates.length) % candidates.length], count: candidates.length };
  };

  /* ---------- Wochenplaner ---------- */
  const DAYS = 7;
  KA.DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  KA.activeSlots = (prefs) => ['f', 'm', 'a', 's'].filter((s) => prefs.meals && prefs.meals[s]);

  const slotShare = (slots) => {
    const sum = slots.reduce((s, k) => s + MEALS[k].w, 0);
    const o = {};
    slots.forEach((k) => (o[k] = MEALS[k].w / sum));
    return o;
  };

  const MICRO_W = { vitC: 1, vitA: 1, vitD: 0.5, b12: 0.7, folat: 1, ca: 1, fe: 1, mg: 1, zn: 1, k: 1 };

  function dayLoss(v, T) {
    let L = 0;
    const c = (k) => v[IDX[k]] / T[k];
    L += 8 * Math.pow(c('kcal') - 1, 2);
    const p = c('prot');
    L += T.custom ? 3 * Math.pow(p - 1, 2) : p < 1 ? 3 * Math.pow(1 - p, 2) : p > 1.8 ? Math.pow(p - 1.8, 2) : 0;
    L += 1.0 * Math.pow(c('carb') - 1, 2);
    L += 1.0 * Math.pow(c('fat') - 1, 2);
    L += 1.0 * Math.pow(Math.max(0, 1 - c('fiber')), 2);
    return L;
  }
  function microLoss(avg, T) {
    let L = 0;
    Object.keys(MICRO_W).forEach((k) => {
      const c = avg[IDX[k]] / T[k];
      L += MICRO_W[k] * Math.pow(Math.max(0, 1 - Math.min(c, 1)), 2);
    });
    return L;
  }

  const clampStep = (x) => Math.max(0.5, Math.min(2.5, Math.round(x * 4) / 4));
  const factorFor = (r, kcalTarget) => clampStep(kcalTarget / (KA.recipeNutr(r)[IDX.kcal] || 1));

  KA.mealVec = (m) => vecScale(KA.recipeNutr(REC[m.rid]), m.f);

  KA.dayVec = (day) => day.reduce((s, m) => vecAdd(s, KA.mealVec(m)), zero());

  KA.weekAvg = (plan) => {
    const tot = plan.days.reduce((s, d) => vecAdd(s, KA.dayVec(d)), zero());
    return vecScale(tot, 1 / plan.days.length);
  };

  function planLoss(plan, T) {
    let L = 0;
    const tot = zero();
    const counts = {};
    plan.days.forEach((day) => {
      const v = KA.dayVec(day);
      L += dayLoss(v, T);
      for (let i = 0; i < tot.length; i++) tot[i] += v[i];
      const seen = {};
      day.forEach((m) => {
        counts[m.rid] = (counts[m.rid] || 0) + 1;
        if (seen[m.rid]) L += 50;
        seen[m.rid] = true;
      });
    });
    const avg = vecScale(tot, 1 / plan.days.length);
    L += 14 * microLoss(avg, T);
    Object.keys(counts).forEach((rid) => {
      if (counts[rid] > 1) L += 1.2 * (counts[rid] - 1);
    });
    return L;
  }

  KA.planSig = (prefs) =>
    JSON.stringify([prefs.diets, prefs.cuisines || [], prefs.dislikes, prefs.maxTime, prefs.maxDiff, !!prefs.onlyMine, prefs.meals, prefs.macro && prefs.macro.enabled ? prefs.macro : null, prefs.body && prefs.body.enabled ? prefs.body : null]);

  KA.slotPool = (prefs, slot) => RECIPES.filter((r) => !r.book && KA.recipeMatches(r, prefs, slot));

  KA.generatePlan = (prefs, oldPlan) => {
    const slots = KA.activeSlots(prefs);
    if (!slots.length) return { error: 'Bitte mindestens eine Mahlzeit pro Tag auswählen.' };
    const T = KA.targets(prefs);
    const share = slotShare(slots);
    const pools = {};
    for (const s of slots) {
      pools[s] = KA.slotPool(prefs, s);
      if (!pools[s].length)
        return { error: `Für „${MEALS[s].label}“ gibt es mit den aktuellen Filtern kein passendes Rezept. Lockere Ernährungsform, Küche, Zeit oder Schwierigkeit${prefs.onlyMine ? ' – oder schalte „Nur meine eigenen Rezepte verwenden“ aus' : ''}.` };
    }
    const mk = (s, r) => ({ slot: s, rid: r.id, f: factorFor(r, T.kcal * share[s]), lock: false });
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const plan = { days: [], sig: KA.planSig(prefs), created: Date.now() };
    for (let d = 0; d < DAYS; d++) {
      const day = slots.map((s) => {
        const old = oldPlan && oldPlan.days && oldPlan.days[d] && oldPlan.days[d].find((m) => m.slot === s && m.lock && REC[m.rid]);
        return old ? Object.assign({}, old) : mk(s, rnd(pools[s]));
      });
      plan.days.push(day);
    }
    let loss = planLoss(plan, T);
    for (let it = 0; it < 6000; it++) {
      const d = Math.floor(Math.random() * DAYS);
      const mi = Math.floor(Math.random() * slots.length);
      const m = plan.days[d][mi];
      if (m.lock) continue;
      const prev = Object.assign({}, m);
      const r = rnd(pools[m.slot]);
      if (r.id === m.rid) continue;
      m.rid = r.id;
      m.f = factorFor(r, T.kcal * share[m.slot]);
      const nl = planLoss(plan, T);
      const temp = 0.4 * (1 - it / 6000);
      if (nl < loss || Math.random() < Math.exp((loss - nl) / Math.max(temp, 1e-6)) * 0.02) loss = nl;
      else Object.assign(m, prev);
    }
    plan.loss = loss;
    return { plan, T };
  };

  // Alternativen für eine Mahlzeit, sortiert nach Gesamtqualität des Plans
  KA.alternatives = (plan, prefs, d, slot) => {
    const T = KA.targets(prefs);
    const share = slotShare(KA.activeSlots(prefs));
    const m = plan.days[d].find((x) => x.slot === slot);
    const pool = KA.slotPool(prefs, slot).filter((r) => r.id !== m.rid);
    const base = planLoss(plan, T);
    const out = pool.map((r) => {
      const prev = { rid: m.rid, f: m.f };
      m.rid = r.id;
      m.f = factorFor(r, T.kcal * share[slot]);
      const l = planLoss(plan, T);
      const f = m.f;
      m.rid = prev.rid;
      m.f = prev.f;
      return { r, f, delta: l - base };
    });
    out.sort((a, b) => a.delta - b.delta);
    return out;
  };

  KA.applyMeal = (plan, prefs, d, slot, rid, f) => {
    const m = plan.days[d].find((x) => x.slot === slot);
    const T = KA.targets(prefs);
    const share = slotShare(KA.activeSlots(prefs));
    m.rid = rid;
    m.f = f != null ? f : factorFor(REC[rid], T.kcal * share[slot]);
    m.lock = false;
  };

  KA.reroll = (plan, prefs, d, slot) => {
    const alts = KA.alternatives(plan, prefs, d, slot);
    if (!alts.length) return false;
    const top = alts.slice(0, Math.min(5, alts.length));
    const pick = top[Math.floor(Math.random() * top.length)];
    KA.applyMeal(plan, prefs, d, slot, pick.r.id, pick.f);
    return true;
  };

  KA.planShopping = (plan, prefs, pantry, subtractPantry) => {
    const need = {};
    const persons = prefs.persons || 1;
    plan.days.forEach((day) =>
      day.forEach((m) => {
        const r = REC[m.rid];
        const k = (m.f * persons) / r.s;
        r.i.forEach(([id, a]) => (need[id] = (need[id] || 0) + a * k));
      })
    );
    if (subtractPantry) Object.keys(need).forEach((id) => (need[id] = Math.max(0, need[id] - (pantry[id] || 0))));
    return KA.buildList(need, prefs);
  };

  /* ---------- Vorrat: Freitext-Eingabe („3 Bananen, 500 g Reis, Milch“) ---------- */
  // Typische Packungsgrößen (Basiseinheit) für „1 Packung/Dose …“ oder eine bloße Zahl bei g/ml-Lebensmitteln
  KA.PACK = {
    milch: 1000, hafermilch: 1000, joghurt: 500, skyr: 450, quark: 500, feta: 200, mozzarella: 125, parmesan: 100,
    kaese: 250, butter: 250, kokosmilch: 400, kichererbsen: 400, kidneybohnen: 400, dosentomaten: 400, mais: 300,
    thunfisch: 150, tomatenmark: 200, tofu: 200, haehnchen: 400, rinderhack: 500, schinken: 125, lachs: 250,
    garnelen: 250, spinat: 450, erbsen: 450, beeren: 300, champignons: 250, rucola: 125, tomaten: 500, vollkornbrot: 500,
    eier: 10, tortilla: 8, mandeln: 200, walnuesse: 200, chia: 200, leinsamen: 250, kuerbiskerne: 200, tahin: 250, erdnussmus: 250,
  };
  // Durchschnittsgewicht pro Stück bei Lebensmitteln, die in Gramm geführt werden
  KA.PIECE = { karotten: 80, kartoffeln: 150, tomaten: 100, suesskartoffel: 300, brokkoli: 400, blumenkohl: 700, kuerbis: 1000, lauch: 250, ingwer: 30 };
  const ALIAS = {
    kartoffel: 'kartoffeln', mohre: 'karotten', mohren: 'karotten', karotte: 'karotten', moehre: 'karotten', moehren: 'karotten',
    nudel: 'nudeln', pasta: 'nudeln', spaghetti: 'nudeln', hack: 'rinderhack', hackfleisch: 'rinderhack', ei: 'eier',
    tomate: 'tomaten', kase: 'kaese', gouda: 'kaese', brot: 'vollkornbrot', wraps: 'tortilla', wrap: 'tortilla', tortillas: 'tortilla',
    ol: 'olivenoel', oel: 'olivenoel', bohnen: 'kidneybohnen', nusse: 'walnuesse', nuesse: 'walnuesse', hahnchen: 'haehnchen',
    huhn: 'haehnchen', apfel: 'aepfel', aepfel: 'aepfel', zwiebeln: 'zwiebel', paprikas: 'paprika', zitronen: 'zitrone',
    knoblauchzehen: 'knoblauch', zehe: 'knoblauch', zehen: 'knoblauch', hafer: 'haferflocken', sahne: null,
  };
  const baseName = (s) => KA.norm(s).replace(/\s*\(.*\)\s*/g, '').trim();
  KA.findIng = (q) => {
    const n = KA.norm(q).replace(/\s+/g, ' ');
    if (!n) return null;
    if (ALIAS[n] !== undefined) return ALIAS[n] ? ING[ALIAS[n]] : null;
    const all = Object.values(ING);
    const variants = [n, n.replace(/en$/, ''), n.replace(/n$/, ''), n.replace(/e$/, ''), n.replace(/s$/, ''), n + 'n', n + 'e', n + 'en'];
    for (const v of variants) {
      const hit = all.find((i) => i.id === v || KA.norm(i.name) === v || baseName(i.name) === v);
      if (hit) return hit;
    }
    if (n.length < 3) return null;
    return all.find((i) => baseName(i.name).startsWith(n)) || all.find((i) => KA.norm(i.name).includes(n)) || null;
  };

  const NUMW = { ein: 1, eine: 1, einen: 1, einer: 1, zwei: 2, drei: 3, vier: 4, funf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwolf: 12, halbe: 0.5, halber: 0.5, halbes: 0.5 };
  const UNITS = [
    [/^(g|gr|gramm)$/, 'g'], [/^(kg|kilo|kilogramm)$/, 'kg'], [/^(ml|milliliter)$/, 'ml'], [/^(l|liter)$/, 'l'],
    [/^(stk|stuck|stueck|x)$/, 'stk'],
    [/^(pck|pckg|pkg|packung|packungen|packchen|dose|dosen|becher|glas|glaser|glaeser|flasche|flaschen|beutel|tute|tuten|tuete|tueten|netz|schale|schalen|bund)$/, 'pack'],
  ];
  // Text -> [{ text, ing, amount (Basiseinheit oder null = Menge offen) }]
  KA.parsePantry = (text) => String(text || '').split(/[,;\n]+|\s+und\s+/i).map((s) => s.trim()).filter(Boolean).map((raw) => {
    const words = raw.replace(/(\d)([a-zA-Zäöü])/g, '$1 $2').split(/\s+/);
    let qty = null, unit = null;
    const w0 = KA.norm(words[0]).replace(',', '.');
    if (/^\d+(\.\d+)?$|^\d+\/\d+$|^[½¼¾]$/.test(w0)) {
      qty = w0.includes('/') ? +w0.split('/')[0] / +w0.split('/')[1] : { '½': 0.5, '¼': 0.25, '¾': 0.75 }[w0] || parseFloat(w0);
      words.shift();
    } else if (NUMW[w0] != null && words.length > 1) { qty = NUMW[w0]; words.shift(); }
    if (words.length > 1) {
      const u = UNITS.find(([re]) => re.test(KA.norm(words[0]).replace(/\.$/, '')));
      if (u) { unit = u[1]; words.shift(); }
    }
    const ing = KA.findIng(words.join(' '));
    if (!ing || qty == null) return { text: raw, ing, amount: null };
    const id = ing.id, pack = KA.PACK[id];
    let amount;
    if (ing.unit === 'Stk') {
      if (unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l') amount = KA.toBase(qty, unit) / ing.gpu;
      else if (unit === 'pack') amount = qty * (pack || 1);
      else amount = qty;
    } else if (unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l') amount = KA.toBase(qty, unit);
    else if (unit === 'pack') amount = qty * (pack || (ing.unit === 'ml' ? 1000 : 500));
    else if (KA.PIECE[id]) amount = qty * KA.PIECE[id];
    else amount = qty >= 10 ? qty : qty * (pack || (ing.unit === 'ml' ? 1000 : 500));
    return { text: raw, ing, amount: Math.round(amount * 100) / 100 };
  });

  KA.DEMO_PANTRY = {
    reis: 500, kichererbsen: 400, spinat: 200, zwiebel: 3, eier: 6, paprika: 2, dosentomaten: 800,
    kokosmilch: 400, haehnchen: 300, joghurt: 250, haferflocken: 300, kartoffeln: 1000, knoblauch: 4,
  };
})(typeof window !== 'undefined' ? window : globalThis);
