/* Kochapp – Logik (ohne DOM): Nährwerte, Filter, Rezept-Finder, Wochenplaner, Einkaufsliste */
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
      flagCache[r.id] = s;
    }
    return flagCache[r.id];
  };

  /* ---------- Präferenzen / Filter ---------- */
  KA.recipeMatches = (r, prefs, slot) => {
    if (slot && !r.types.includes(slot)) return false;
    if (prefs.maxTime && r.time > prefs.maxTime) return false;
    if (prefs.maxDiff && r.diff > prefs.maxDiff) return false;
    const flags = KA.recipeFlags(r);
    const n = KA.recipeNutr(r);
    const kcal = n[IDX.kcal] || 1;
    for (const d of prefs.diets || []) {
      const def = DIETS[d];
      if (!def) continue;
      if (def.excl && def.excl.some((f) => flags.has(f))) return false;
      if (def.macro === 'lowcarb' && (n[IDX.carb] * 4) / kcal > 0.3) return false;
      if (def.macro === 'highprotein' && (n[IDX.prot] * 4) / kcal < 0.22) return false;
    }
    const dis = (prefs.dislikes || []).map(KA.norm).filter(Boolean);
    if (dis.length) {
      const hay = [KA.norm(r.name)].concat(r.i.map(([id]) => KA.norm(ING[id].name) + ' ' + id));
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
    JSON.stringify([prefs.diets, prefs.dislikes, prefs.maxTime, prefs.maxDiff, prefs.meals, prefs.macro && prefs.macro.enabled ? prefs.macro : null, prefs.body && prefs.body.enabled ? prefs.body : null]);

  KA.slotPool = (prefs, slot) => RECIPES.filter((r) => KA.recipeMatches(r, prefs, slot));

  KA.generatePlan = (prefs, oldPlan) => {
    const slots = KA.activeSlots(prefs);
    if (!slots.length) return { error: 'Bitte mindestens eine Mahlzeit pro Tag auswählen.' };
    const T = KA.targets(prefs);
    const share = slotShare(slots);
    const pools = {};
    for (const s of slots) {
      pools[s] = KA.slotPool(prefs, s);
      if (!pools[s].length)
        return { error: `Für „${MEALS[s].label}“ gibt es mit den aktuellen Filtern kein passendes Rezept. Lockere Ernährungsform, Zeit oder Schwierigkeit.` };
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

  KA.DEMO_PANTRY = {
    reis: 500, kichererbsen: 400, spinat: 200, zwiebel: 3, eier: 6, paprika: 2, dosentomaten: 800,
    kokosmilch: 400, haehnchen: 300, joghurt: 250, haferflocken: 300, kartoffeln: 1000, knoblauch: 4,
  };
})(typeof window !== 'undefined' ? window : globalThis);
