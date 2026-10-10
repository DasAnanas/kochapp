/* Kochapp – Oberfläche */
(function () {
  'use strict';
  const KA = window.KA;
  const { ING, REC, DIETS, CATS, NUTRIENTS, MEALS } = KA;
  const STORE = 'kochapp.v1';

  /* ---------- State ---------- */
  const DEF = () => ({
    tab: 'book',
    my: [], list: [], extras: [], done: {}, // Rezeptbuch: eigene Rezepte, Rezepte auf der Einkaufsliste, freie Artikel, Häkchen
    prefs: {
      diets: [], cuisines: [], dislikes: [], maxTime: 60, maxDiff: 3, persons: 2, assumeStaples: true, onlyMine: false,
      meals: { f: 1, m: 1, a: 1, s: 0 },
      macro: { enabled: false, p: 20, c: 50, f: 30 },
      body: { enabled: false, sex: 'm', age: 30, height: 175, weight: 70, activity: 1.6, goal: 'keep' },
    },
    pantry: {}, pantryMode: 'simple', sel: [], comboN: 3, plan: null, subPantry: true,
    // Einkaufsliste: Rezepte (list) + übernommene Rezept-Auswahl / Wochenplan (blocks) + eigene Artikel (extras); done = abgehakt
    blocks: { finder: null, plan: null },
    foods: [], // eigene Lebensmittel: { id, name, unit, gpu, tl, n: [15 Nährwerte je 100 g/ml], flags, src }
    order: { provider: 'rewe', cfg: { rewe: { service: 'DELIVERY' }, rest: { method: 'POST', authHeader: 'Authorization' }, mailto: {}, mock: {} }, customer: { name: '', street: '', zip: '', city: '' } },
  });
  const merge = (a, b) => {
    if (b && typeof b === 'object' && !Array.isArray(b) && a && typeof a === 'object' && !Array.isArray(a)) {
      Object.keys(b).forEach((k) => (a[k] = k in a ? merge(a[k], b[k]) : b[k]));
      return a;
    }
    return b === undefined ? a : b;
  };
  let S = DEF();
  try { S = merge(DEF(), JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { toast('Speichern fehlgeschlagen – der lokale Speicher ist voll.'); } };
  const emptyDraft = () => ({ title: '', serv: 4, time: '', cat: 'Hauptgericht', cuisine: '', diff: 2, ings: [], steps: [], image: '' });
  const ui = {
    open: new Set(), nutDay: -1, preview: false, orderResult: null, ordering: false, planError: '', focus: null,
    fcat: 'Alle', flimit: 24, book: 'library', selId: null, detailServ: 2, filter: 'Alle', cuisine: 'Alle', query: '', addMode: 'manual', draft: emptyDraft(),
    scan: null, scanPhase: 'idle', link: { url: '', phase: 'idle' },
  };

  const setPath = (o, path, v) => {
    const p = path.split('.');
    const last = p.pop();
    p.forEach((k) => (o = o[k] = o[k] || {}));
    o[last] = v;
  };

  /* ---------- Helfer ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DIFF = ['', 'Einfach', 'Mittel', 'Anspruchsvoll'];
  const dots = (d) => '●'.repeat(d) + '○'.repeat(3 - d);
  const TIMES = [[15, '15 Min.'], [30, '30 Min.'], [45, '45 Min.'], [60, '60 Min.'], [90, '90 Min.'], [0, 'egal']];
  const r0 = (x) => Math.round(x);
  const portion = (f) => KA.fmtNum(f, 2);

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- Gemeinsame Bausteine ---------- */
  // Küchen, zu denen es Rezepte gibt (in der Reihenfolge von KA.KUECHEN)
  const usedCuisines = () => KA.KUECHEN.filter((k) => KA.RECIPES.some((r) => (r.k || 'International') === k) || (S.prefs.cuisines || []).includes(k));
  function filterBar() {
    const p = S.prefs;
    return `
    <div class="fgroup"><div class="flabel">Ernährung <small>(frei kombinierbar)</small></div>
      <div class="chips">${Object.entries(DIETS).map(([k, d]) =>
        `<label class="chip"><input type="checkbox" data-diet="${k}" ${p.diets.includes(k) ? 'checked' : ''}><span>${esc(d.label)}</span></label>`).join('')}</div></div>
    <div class="fgroup"><div class="flabel">Küche <small>(keine Auswahl = alle Küchen)</small></div>
      <div class="chips">${usedCuisines().map((k) =>
        `<label class="chip"><input type="checkbox" data-cuisine="${esc(k)}" ${(p.cuisines || []).includes(k) ? 'checked' : ''}><span>${esc(k)}</span></label>`).join('')}</div></div>
    <div class="frow">
      <div class="fgroup"><div class="flabel">Max. Zubereitungszeit</div>
        <div class="seg">${TIMES.map(([v, l]) => `<button class="${p.maxTime === v ? 'on' : ''}" data-act="setTime" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="fgroup"><div class="flabel">Max. Schwierigkeit</div>
        <div class="seg">${[1, 2, 3].map((v) => `<button class="${p.maxDiff === v ? 'on' : ''}" data-act="setDiff" data-v="${v}">${dots(v)} ${DIFF[v]}</button>`).join('')}</div></div>
    </div>`;
  }
  const filterDetails = (key) => {
    const n = S.prefs.diets.length;
    const nk = (S.prefs.cuisines || []).length;
    const t = S.prefs.maxTime ? `≤ ${S.prefs.maxTime} Min.` : 'Zeit egal';
    return `<details class="card filt" data-key="${key}" ${ui.open.has(key) ? 'open' : ''}>
      <summary><b>Präferenzen</b> <span class="muted">${n ? n + ' Ernährungsform' + (n > 1 ? 'en' : '') + ' · ' : ''}${nk ? nk + (nk > 1 ? ' Küchen' : ' Küche') + ' · ' : ''}${t} · bis ${DIFF[S.prefs.maxDiff].toLowerCase()}</span></summary>
      ${filterBar()}<p class="muted sm">Weitere Einstellungen (Ausschlüsse, Personen, Körperdaten) findest du im Tab „Profil“.</p></details>`;
  };

  const tag = (txt, cls) => `<span class="tag ${cls || ''}">${esc(txt)}</span>`;
  // Labels eines Rezepts: Küche, Ernährungsform, Unverträglichkeiten, Nährwert-Profil. Ernährungs-Labels werden nur vergeben,
  // wenn alle Zutaten bekannt sind; Nährwert-Labels nur bei vollständigen Nährwerten.
  function recipeTags(r, noCuisine) {
    const f = KA.recipeFlags(r);
    const t = [];
    if (r.user) t.push(tag('eigenes'));
    if (r.k && !noCuisine) t.push(tag(r.k, 'kueche'));
    if (f.has('unbekannt')) return t.concat(tag('Labels unvollständig', 'warn')).join('');
    const meat = f.has('fleisch') || f.has('gelatine');
    if (!meat && !f.has('fisch') && !f.has('schalentier')) t.push(tag(!f.has('milch') && !f.has('ei') && !f.has('honig') ? 'vegan' : 'vegetarisch'));
    else if (!meat) t.push(tag('pescetarisch'));
    else t.push(tag(f.has('fleisch') ? 'mit Fleisch' : 'mit Gelatine', 'neutral'));
    if (!f.has('gluten')) t.push(tag('glutenfrei'));
    if (!f.has('milch')) t.push(tag('laktosefrei'));
    if (!f.has('nuss') && !f.has('erdnuss')) t.push(tag('nussfrei'));
    if (!r.partial) {
      const n = KA.recipeNutr(r);
      if ((n[1] * 4) / n[0] >= 0.22) t.push(tag('high protein'));
      if ((n[2] * 4) / n[0] <= 0.3) t.push(tag('low carb'));
    }
    if (f.has('alkohol')) t.push(tag('mit Alkohol', 'warn'));
    return t.join('');
  }

  function ingTable(r, servings, ev) {
    const k = servings / r.s;
    const rows = r.i.map(([id, a]) => {
      const need = a * k;
      let st = '';
      if (ev) {
        const l = ev.lines.find((x) => x.id === id);
        if (l.basic) st = '<span class="st basic">Basis</span>';
        else if (l.used >= l.need - 1e-6) st = '<span class="st ok">vorhanden</span>';
        else if (l.used > 0) st = `<span class="st part">es fehlen ${KA.fmtAmount(id, l.missing)}</span>`;
        else st = '<span class="st miss">fehlt</span>';
      }
      return `<tr><td>${esc(ING[id].name)}</td><td class="num">${KA.fmtAmount(id, need)}</td><td>${st}</td></tr>`;
    }).join('');
    // eigene Rezepte: Zutaten ohne Stammdaten werden nur aufgeführt, nicht mit dem Vorrat verrechnet
    const free = (r.free || []).map((i) => `<tr><td>${esc(i.name)}</td><td class="num">${esc(ingQty(i, k))}</td><td>${ev ? '<span class="st basic">nicht verrechnet</span>' : ''}</td></tr>`).join('');
    return `<table class="ings"><tbody>${rows}${free}</tbody></table>`;
  }

  function recipeFacts(r) {
    if (r.partial) return `⏱ ${r.time} Min. · <span title="${DIFF[r.diff]}">${dots(r.diff)}</span> · ${esc(r.cat || '')} · <span title="Nicht alle Zutaten sind in den Lebensmitteldaten erfasst">Nährwerte unvollständig</span>`;
    const n = KA.recipeNutr(r);
    return `⏱ ${r.time} Min. · <span title="${DIFF[r.diff]}">${dots(r.diff)}</span> · ${r0(n[0])} kcal · ${r0(n[1])} g Eiweiß · ca. ${KA.fmtEUR(KA.recipeCost(r))} p. P.`;
  }

  function listHTML(items, opts) {
    opts = opts || {};
    if (!items.length) return '<p class="muted">Nichts zu kaufen – du hast alles da. 🎉</p>';
    let html = '';
    let cat = null;
    items.forEach((it, i) => {
      if (it.cat !== cat) {
        if (cat) html += '</ul>';
        cat = it.cat;
        html += `<h4 class="cat">${esc(CATS[cat])}</h4><ul class="slist">`;
      }
      html += `<li class="${it.checked === false ? 'off' : ''}">
        ${opts.editable ? `<label class="chk"><input type="checkbox" data-act="chk" data-i="${i}" ${it.checked === false ? '' : 'checked'}><span></span></label>` : '<span class="bul">•</span>'}
        <span class="nm">${esc(it.name)}</span><span class="am">${it.id ? KA.fmtAmount(it.id, it.amount) : esc(it.label || '')}</span>
        <span class="pr">${it.id ? KA.fmtEUR(it.price) : ''}</span>
        ${opts.editable ? `<button class="x" data-act="delitem" data-i="${i}" title="Entfernen">✕</button>` : ''}</li>`;
    });
    return html + '</ul>';
  }
  const listTotal = (items) => items.filter((i) => i.checked !== false).reduce((s, i) => s + i.price, 0);

  /* ---------- Präferenzen (direkt vor jeder Funktion) ---------- */
  function prefsCard() {
    const p = S.prefs;
    const dis = p.dislikes.map((d, i) => `<span class="pill">${esc(d)}<button data-act="deldis" data-i="${i}" title="Entfernen">✕</button></span>`).join('');
    return `<section class="card"><h2>Präferenzen</h2>${filterBar()}
      <div class="fgroup"><div class="flabel">Das mag ich nicht / vertrage ich nicht</div>
        <div class="addrow"><input id="dis-in" placeholder="z. B. Pilze, Koriander, Lachs …" autocomplete="off"><button class="btn" data-act="adddis">Hinzufügen</button></div>
        <div class="pills">${dis || '<span class="muted sm">Noch nichts ausgeschlossen.</span>'}</div></div>
      <div class="frow">
        <div class="fgroup"><div class="flabel">Personen (Portionen)</div>
          <input class="narrow" type="number" min="1" max="12" step="1" value="${p.persons}" data-bind="prefs.persons" data-num="1"></div>
        <label class="switch"><input type="checkbox" data-bind="prefs.assumeStaples" ${p.assumeStaples ? 'checked' : ''}><span>Salz, Pfeffer, Öl, Brühe & Gewürze sind immer da</span></label>
        <label class="switch"><input type="checkbox" data-bind="prefs.onlyMine" ${p.onlyMine ? 'checked' : ''}><span>Nur meine eigenen Rezepte verwenden <span class="muted">(${usableMine} von ${S.my.length} nutzbar)</span></span></label>
      </div>
      ${p.onlyMine && !usableMine ? `<p class="warn">${S.my.length ? 'Keines deiner Rezepte ist hier nutzbar: Dafür braucht mindestens eine Zutat einen Namen aus der Lebensmittelliste (wie bei „Mein Vorrat“) und eine Menge in g, ml oder Stk.' : 'Du hast noch keine eigenen Rezepte angelegt.'} <button class="btn sm" data-act="bookadd">Rezept anlegen</button></p>` : ''}
      </section>`;
  }

  const MACRO_PRESETS = { balanced: ['Ausgewogen', 20, 50, 30], highprotein: ['Eiweißreich', 30, 40, 30], lowcarb: ['Low Carb', 30, 25, 45], lowfat: ['Fettarm', 25, 55, 20] };

  // Nur für den Wochenplan: Mahlzeiten, Makro-Verhältnis, Körperdaten
  function planSettings() {
    const p = S.prefs, b = p.body, m = p.macro;
    const T = KA.targets(p);
    const sum = m.p + m.c + m.f;
    return `<section class="card"><h2>Plan-Einstellungen</h2>
      <div class="fgroup"><div class="flabel">Mahlzeiten pro Tag</div>
        <div class="chips">${['f', 'm', 'a', 's'].map((k) => `<label class="chip"><input type="checkbox" data-meal="${k}" ${p.meals[k] ? 'checked' : ''}><span>${MEALS[k].label}</span></label>`).join('')}</div></div>

      <h4 class="cat">Makro-Verhältnis <span class="opt">optional</span></h4>
      <label class="switch"><input type="checkbox" data-bind="prefs.macro.enabled" ${m.enabled ? 'checked' : ''}><span>Verhältnis von Eiweiß / Kohlenhydraten / Fett selbst festlegen</span></label>
      <div>
        <div class="seg wrap">${Object.entries(MACRO_PRESETS).map(([k, v]) => `<button class="${m.enabled && m.p === v[1] && m.c === v[2] && m.f === v[3] ? 'on' : ''}" data-act="setMacro" data-v="${k}">${v[0]} (${v[1]}/${v[2]}/${v[3]})</button>`).join('')}</div>
        <div class="grid4 ${m.enabled ? '' : 'dim'}"><label>Eiweiß (% der Kalorien)<input type="number" min="10" max="60" value="${m.p}" data-bind="prefs.macro.p" data-num="1"></label>
          <label>Kohlenhydrate (%)<input type="number" min="5" max="75" value="${m.c}" data-bind="prefs.macro.c" data-num="1"></label>
          <label>Fett (%)<input type="number" min="10" max="70" value="${m.f}" data-bind="prefs.macro.f" data-num="1"></label></div>
        ${sum === 100 ? `<p class="muted sm">Summe 100 % ✓</p>` : `<p class="warn">Die drei Werte müssen zusammen 100 % ergeben (aktuell ${sum} %).</p>`}
      </div>
      <p class="muted sm">Ohne eigene Vorgabe wird Eiweiß nach Körpergewicht bzw. Referenz berechnet, Fett mit 30 % und der Rest als Kohlenhydrate.</p>

      <h4 class="cat">Körperdaten <span class="opt">optional</span></h4>
      <p class="muted sm">Damit berechnet der Plan deinen Kalorien- und Nährstoffbedarf. Ohne Angaben: Referenz für Erwachsene (2.000 kcal). Die Daten bleiben nur in deinem Browser und werden nur für den Wochenplan verwendet.</p>
      <label class="switch"><input type="checkbox" data-bind="prefs.body.enabled" ${b.enabled ? 'checked' : ''}><span>Körperdaten für den Plan verwenden</span></label>
      <div class="grid4 ${b.enabled ? '' : 'dim'}">
        <label>Geschlecht<select data-bind="prefs.body.sex"><option value="m" ${b.sex === 'm' ? 'selected' : ''}>männlich</option><option value="f" ${b.sex === 'f' ? 'selected' : ''}>weiblich</option></select></label>
        <label>Alter (Jahre)<input type="number" min="14" max="99" value="${b.age}" data-bind="prefs.body.age" data-num="1"></label>
        <label>Größe (cm)<input type="number" min="120" max="230" value="${b.height}" data-bind="prefs.body.height" data-num="1"></label>
        <label>Gewicht (kg)<input type="number" min="35" max="250" value="${b.weight}" data-bind="prefs.body.weight" data-num="1"></label>
        <label>Aktivität<select data-bind="prefs.body.activity" data-num="1">${Object.entries(KA.ACTIVITY).map(([v, l]) => `<option value="${v}" ${Number(b.activity) === Number(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Ziel<select data-bind="prefs.body.goal">${[['keep', 'Gewicht halten'], ['lose', 'Abnehmen'], ['gain', 'Muskeln aufbauen']].map(([v, l]) => `<option value="${v}" ${b.goal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="tgt"><b>Tagesziel${T.known ? '' : ' (Referenz)'}:</b> ${KA.fmtNum(T.kcal, 0)} kcal · ${T.prot} g Eiweiß · ${T.carb} g Kohlenhydrate · ${T.fat} g Fett · ${T.fiber} g Ballaststoffe
        ${T.known ? `<br><span class="muted sm">Grundumsatz ${r0(T.bmr)} kcal (Mifflin-St Jeor) × Aktivitätsfaktor, angepasst ans Ziel.</span>` : ''}</div>
      <p class="muted sm">Nährwerte sind Näherungswerte und ersetzen keine Ernährungs- oder medizinische Beratung.</p>
    </section>`;
  }

  /* ---------- Vorrat: drei Modi (ohne · abhaken · mit Mengen) ---------- */
  // null als Menge = „vorhanden, Menge offen“. Für die Berechnungen zählt das (wie im Abhak-Modus) als genug da.
  const BIG = 1e6;
  const PMODES = [
    ['off', '01', 'Ohne Vorrat', 'Nichts pflegen: Rezepte und Einkaufslisten enthalten immer alle Zutaten.'],
    ['simple', '02', 'Nur abhaken', 'Antippen, was da ist – ohne Mengen. Vorhandenes kommt nicht auf die Einkaufsliste.'],
    ['exact', '03', 'Mit Mengen', 'Genau mitzählen: Gekochtes wird abgezogen, fehlende Mengen werden eingekauft.']];
  const pMode = () => (PMODES.some((m) => m[0] === S.pantryMode) ? S.pantryMode : 'simple');
  const pIds = () => Object.keys(S.pantry).filter((id) => ING[id]);
  function pantryEff() {
    const mode = pMode(), o = {};
    if (mode === 'off') return o;
    pIds().forEach((id) => { const v = S.pantry[id]; o[id] = mode === 'simple' || v == null ? BIG : v; });
    return o;
  }
  const pStep = (id, v) => (ING[id].unit === 'Stk' ? 1 : v != null && v < 200 ? 50 : 100);
  const pDefault = (id) => (ING[id].unit === 'Stk' ? 1 : KA.PACK[id] || (ING[id].unit === 'ml' ? 1000 : 500));
  const pAmt = (id) => (S.pantry[id] == null ? 'Menge offen' : KA.fmtAmount(id, S.pantry[id]));
  const pantryIngs = () => Object.values(ING).filter((i) => !(S.prefs.assumeStaples && i.staple));

  function pantryModes() {
    return `<div class="addtabs">${PMODES.map(([k, num, label, desc]) => `<button class="${pMode() === k ? 'on' : ''}" data-act="pmode" data-v="${k}"><i>${num}</i><b>${label}</b><span>${desc}</span></button>`).join('')}</div>`;
  }
  // Kompakte Umschaltung über den Rezepten
  function pantryBar() {
    const mode = pMode(), n = pIds().length;
    const info = mode === 'off' ? 'Ohne Vorrat – es werden alle Zutaten eingeplant.' : n ? `${n} Lebensmittel ${mode === 'simple' ? 'abgehakt' : 'eingetragen'}` : 'Noch nichts eingetragen';
    return `<section class="card pbar"><div><b>Vorrat</b> <span class="muted">${esc(info)}</span></div>
      <div class="pbar-r"><div class="seg">${PMODES.map(([k, , l]) => `<button class="${mode === k ? 'on' : ''}" data-act="pmode" data-v="${k}">${l}</button>`).join('')}</div>
      ${mode === 'off' ? '' : '<button class="btn ghost sm" data-act="tab" data-v="pantry">Vorrat bearbeiten →</button>'}</div></section>`;
  }

  function quickAdd() {
    return `<div class="fgroup"><div class="flabel">Was hast du da? <small>(mehrere mit Komma trennen)</small></div>
      <div class="addrow"><input id="p-quick" placeholder="z. B. 3 Bananen, 500 g Haferflocken, Milch" autocomplete="off" aria-describedby="p-prev"><button class="btn" data-act="pquick">Hinzufügen</button></div>
      <div class="prev" id="p-prev" aria-live="polite"></div>
      <p class="muted sm">${pMode() === 'simple' ? 'Mengen kannst du einfach weglassen.' : 'Ohne Menge wird „Menge offen“ eingetragen – das zählt als vorhanden.'} Verstanden wird auch „2 Dosen Kichererbsen“, „1 Packung Eier“ oder „drei Karotten“.</p></div>`;
  }
  function quickPreview(text) {
    const parts = KA.parsePantry(text);
    if (!parts.length) return '';
    const simple = pMode() === 'simple';
    return '<span>Erkannt:</span>' + parts.map((p) => (p.ing
      ? `<b>${esc((!simple && p.amount != null ? KA.fmtAmount(p.ing.id, p.amount) + ' ' : '') + p.ing.name)}</b>`
      : `<b class="bad" title="Nicht gefunden – bitte anders schreiben oder unten antippen">? ${esc(p.text)}</b>`)).join('');
  }
  // Alle Lebensmittel als Chips zum Antippen, nach Kategorien
  function chipGrid() {
    const all = pantryIngs();
    return Object.keys(CATS).map((c) => {
      const list = all.filter((i) => i.cat === c).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (!list.length) return '';
      const n = list.filter((i) => i.id in S.pantry).length;
      return `<div class="pcat"><span class="slabel">${esc(CATS[c])}${n ? ` <em>${n}</em>` : ''}</span><div class="chips">${list.map((i) =>
        `<label class="chip"><input type="checkbox" data-pchip="${i.id}" ${i.id in S.pantry ? 'checked' : ''}><span>${esc(i.name)}</span></label>`).join('')}</div></div>`;
    }).join('');
  }
  // Mengen-Liste mit −/+ je Lebensmittel
  function amountList() {
    const ids = pIds();
    if (!ids.length) return '<p class="muted">Noch nichts eingetragen. Tippe oben z. B. „3 Bananen“ ein oder wähle unten aus der Liste.</p>';
    return Object.keys(CATS).map((c) => {
      const list = ids.filter((id) => ING[id].cat === c).sort((a, b) => ING[a].name.localeCompare(ING[b].name, 'de'));
      if (!list.length) return '';
      return `<div class="pcat"><span class="slabel">${esc(CATS[c])}</span>${list.map((id) => {
        const v = S.pantry[id];
        return `<div class="prow ${v == null ? 'open' : ''}"><span class="nm">${esc(ING[id].name)}</span>
          <div class="step sm pstep"><button data-act="pstep" data-id="${id}" data-d="-1" aria-label="Weniger ${esc(ING[id].name)}">−</button>
            <input class="pamt" inputmode="decimal" value="${v == null ? '' : Math.round(v * 100) / 100}" placeholder="?" data-id="${id}" aria-label="Menge ${esc(ING[id].name)} in ${ING[id].unit}"><span class="u">${ING[id].unit}</span>
            <button data-act="pstep" data-id="${id}" data-d="1" aria-label="Mehr ${esc(ING[id].name)}">+</button></div>
          ${v == null ? '<span class="st part">Menge offen</span>' : '<span></span>'}
          <button class="x" data-act="delp" data-id="${id}" title="Entfernen">✕</button></div>`;
      }).join('')}</div>`;
    }).join('');
  }

  function pantryCard() {
    const mode = pMode(), n = pIds().length;
    let body;
    if (mode === 'off') {
      body = `<section class="card center"><h2>Ohne Vorrat unterwegs</h2>
        <p class="muted">Rezeptvorschläge, Wochenplan und Einkaufslisten funktionieren ganz normal – es wird nur nichts abgezogen, alle Zutaten landen auf der Liste.</p>
        ${n ? `<p class="muted sm">Deine ${n} eingetragenen Lebensmittel bleiben gespeichert und sind wieder da, sobald du den Vorrat einschaltest.</p>` : ''}
        <div class="btnrow" style="justify-content:center"><button class="btn ghost" data-act="pmode" data-v="simple">Vorrat doch nutzen</button></div></section>`;
    } else if (mode === 'simple') {
      body = `<section class="card"><div class="lh"><h2>Mein Vorrat</h2><span class="muted sm">${n} Lebensmittel abgehakt</span></div>
        ${quickAdd()}<h4 class="cat">Oder antippen, was da ist</h4><div class="pgrid">${chipGrid()}</div>
        ${pantryButtons(n)}</section>`;
    } else {
      body = `<section class="card"><div class="lh"><h2>Mein Vorrat</h2><span class="muted sm">${n} Lebensmittel</span></div>
        ${quickAdd()}<div class="plist2">${amountList()}</div>
        <details class="pick2" data-key="ppick" ${ui.open.has('ppick') ? 'open' : ''}><summary>Aus der Liste antippen <span class="muted">ohne Menge, später ergänzen</span></summary><div class="pgrid">${chipGrid()}</div></details>
        ${pantryButtons(n)}</section>`;
    }
    return `<h2 class="sec">Wie möchtest du deinen Vorrat nutzen?</h2>` + pantryModes() + body;
  }
  const pantryButtons = (n) => `<div class="btnrow"><button class="btn ghost" data-act="demop">Beispiel-Vorrat laden</button>${n ? '<button class="btn ghost" data-act="clearp">Leeren</button>' : ''}</div>`;

  function recipeCard(e, selected) {
    const r = e.r;
    const mode = pMode();
    const key = 'rc-' + r.id;
    return `<article class="rc ${selected ? 'sel' : ''}">
      <div class="rc-top"><h3>${esc(r.name)}</h3>
        <label class="pick" title="Für die Einkaufsliste auswählen"><input type="checkbox" data-act="togglesel" data-id="${r.id}" ${selected ? 'checked' : ''}><span>Auswählen</span></label></div>
      <div class="meta">${recipeFacts(r)}</div>
      <div class="tags">${recipeTags(r)}</div>
      ${mode === 'off' ? '' : `<div class="meters">
        <div><div class="mlabel">Zutaten vorhanden <b>${r0(e.cover * 100)} %</b></div><div class="bar"><i style="width:${r0(e.cover * 100)}%"></i></div></div>
        <div><div class="mlabel">Verbraucht <b>${e.touched} von ${e.pantryCount}</b> Vorratsartikeln</div><div class="bar alt"><i style="width:${r0((e.touched / Math.max(1, e.pantryCount)) * 100)}%"></i></div></div>
      </div>`}
      <details data-key="${key}" ${ui.open.has(key) ? 'open' : ''}><summary>Zutaten & Zubereitung (${e.servings} Portion${e.servings > 1 ? 'en' : ''})</summary>
        ${ingTable(r, e.servings, mode === 'off' ? null : e)}<ol class="steps">${r.st.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        ${mode === 'exact' ? `<button class="btn ghost sm" data-act="cook" data-id="${r.id}">✔ Gekocht – Vorrat abziehen</button>` : ''}</details>
    </article>`;
  }

  function selectionCard(sel, pantry, title, empty) {
    const list = sel.length ? finderList(sel, pantry) : [];
    return `<section class="card"><h2>${title}</h2>${
      sel.length
        ? `<p class="muted">Für ${sel.length} ausgewählte${sel.length > 1 ? '' : 's'} Gericht${sel.length > 1 ? 'e' : ''}: ${sel.map((id) => esc(REC[id].name)).join(' · ')}</p>${listHTML(list)}
           <div class="total">Geschätzt: <b>${KA.fmtEUR(listTotal(list))}</b></div>
           <div class="btnrow"><button class="btn" data-act="tofinderlist">Auf die Einkaufsliste →</button><button class="btn ghost" data-act="clearsel">Auswahl leeren</button></div>`
        : `<p class="muted">${empty}</p>`}</section>`;
  }

  // Trefferliste der Rezeptfindung mit Kategorie-Filter; zeigt die ersten ui.flimit Treffer
  function resultGrid(title, results, sel) {
    const cats = BOOK_CATS.filter((c) => results.some((e) => e.r.cat === c));
    if (ui.fcat !== 'Alle' && !cats.includes(ui.fcat)) ui.fcat = 'Alle';
    const list = ui.fcat === 'Alle' ? results : results.filter((e) => e.r.cat === ui.fcat);
    const more = list.length - ui.flimit;
    return `<h2 class="sec">${title} <span class="opt">${list.length}</span></h2>
      ${cats.length > 1 ? `<div class="fchips">${['Alle'].concat(cats).map((c) => `<button class="${ui.fcat === c ? 'on' : ''}" data-act="fcat" data-v="${c}">${c} <i>${c === 'Alle' ? results.length : results.filter((e) => e.r.cat === c).length}</i></button>`).join('')}</div>` : ''}
      <div class="rgrid">${list.slice(0, ui.flimit).map((e) => recipeCard(e, sel.includes(e.r.id))).join('')}</div>
      ${more > 0 ? `<div class="btnrow"><button class="btn ghost" data-act="fmore">${Math.min(more, 24)} weitere anzeigen</button><span class="muted sm">${more} noch nicht angezeigt</span></div>` : ''}`;
  }

  function viewFinder() {
    const p = S.prefs;
    const mode = pMode();
    const P = pantryEff();
    const sel = S.sel.filter((id) => REC[id]);
    let out = '';
    if (mode === 'off') {
      const results = KA.RECIPES.filter((r) => KA.recipeMatches(r, p)).sort((a, b) => a.time - b.time || a.name.localeCompare(b.name, 'de'))
        .map((r) => KA.evalRecipe(r, {}, p.persons || 2, p));
      if (!results.length) return pageHead('Rezepte finden', 'Passende Gerichte zu deinen Präferenzen.') + pantryBar() + prefsCard() +
        '<section class="card"><h2>Rezepte</h2><p class="muted">Mit deinen Filtern passt aktuell kein Rezept. Lockere die Präferenzen.</p></section>';
      out += selectionCard(sel, {}, 'Einkaufsliste für deine Auswahl', 'Wähle unten Rezepte aus – hier erscheint dann alles, was du dafür einkaufen musst.');
      out += resultGrid('Passende Rezepte', results, sel);
      return pageHead('Rezepte finden', 'Passende Gerichte zu deinen Präferenzen – alles Nötige kommt auf die Einkaufsliste.') + pantryBar() + prefsCard() + out;
    }
    if (Object.keys(P).length) {
      const results = KA.findRecipes(P, p);
      const combo = KA.bestCombo(P, p, S.comboN);
      if (!results.length) {
        out = '<section class="card"><h2>Rezepte</h2><p class="muted">Mit deinen Filtern und deinem Vorrat passt aktuell kein Rezept. Lockere die Präferenzen oder füge Lebensmittel hinzu.</p></section>';
      } else {
        const usage = KA.pantryUsage(combo, P, p);
        const same = combo.length === sel.length && combo.every((x) => sel.includes(x));
        const exact = mode === 'exact' && !pIds().some((id) => S.pantry[id] == null);
        out += `<section class="card combo"><h2>Beste Kombination <span class="opt">verbraucht möglichst viel vom Vorrat</span></h2>
          <div class="frow"><label>Anzahl Gerichte <input class="narrow" type="number" min="1" max="6" value="${S.comboN}" data-bind="comboN" data-num="1"></label>
          <span class="muted">für ${p.persons} Person${p.persons > 1 ? 'en' : ''}</span></div>
          <ol class="combolist">${combo.map((id) => `<li><b>${esc(REC[id].name)}</b> <span class="muted">⏱ ${REC[id].time} Min. · ${dots(REC[id].diff)}</span></li>`).join('')}</ol>
          <p>Damit werden <b>${usage.touched} von ${usage.count}</b> Vorratsartikeln verwendet${exact ? ` (ca. ${r0(usage.massFrac * 100)} % der Mengen)` : ''}.</p>
          <button class="btn" data-act="takecombo" ${same ? 'disabled' : ''}>${same ? '✔ Übernommen' : 'Kombination übernehmen'}</button></section>`;
        out += selectionCard(sel, P, 'Einkaufsliste für die Reste', 'Wähle unten Rezepte aus (oder übernimm die beste Kombination), dann erscheint hier, was zusätzlich besorgt werden muss.');
        out += resultGrid('Alle passenden Rezepte', results, sel);
      }
    } else {
      out = `<section class="card"><h2>Rezepte</h2><p class="muted">${mode === 'simple' ? 'Hake zuerst ab, was du da hast' : 'Trage zuerst deinen Vorrat ein'} – die App schlägt dann Rezepte vor, die möglichst viel davon verwenden, und erstellt eine Einkaufsliste für den Rest. Oder nutze die App ganz ohne Vorrat.</p>
        <div class="btnrow"><button class="btn" data-act="tab" data-v="pantry">Zum Vorrat →</button><button class="btn ghost" data-act="pmode" data-v="off">Ohne Vorrat weiter</button></div></section>`;
    }
    return pageHead('Rezepte aus Vorrat', 'Verwerte, was du da hast – der Rest kommt auf die Einkaufsliste.') + pantryBar() + prefsCard() + out;
  }

  /* ---------- Tab: Wochenplan ---------- */
  function nutPanel(plan, T) {
    const day = ui.nutDay;
    const vec = day < 0 ? KA.weekAvg(plan) : KA.dayVec(plan.days[day]);
    const row = (n, i) => {
      const t = T[n.k];
      const pct = (vec[i] / t) * 100;
      let cls = 'ok';
      if (['kcal', 'carb', 'fat'].includes(n.k)) cls = Math.abs(pct - 100) <= 15 ? 'ok' : Math.abs(pct - 100) <= 30 ? 'mid' : 'low';
      else cls = pct >= 90 ? 'ok' : pct >= 60 ? 'mid' : 'low';
      return `<div class="nrow"><span class="nl">${n.label}</span><div class="bar n ${cls}"><i style="width:${Math.min(100, pct)}%"></i></div>
        <span class="np">${r0(pct)} %</span><span class="na muted">${KA.fmtNum(vec[i], vec[i] < 10 ? 1 : 0)} / ${KA.fmtNum(t, t < 10 ? 1 : 0)} ${n.unit}</span></div>`;
    };
    const idx = (g) => NUTRIENTS.map((n, i) => [n, i]).filter(([n]) => n.group === g);
    const tabs = ['Ø Woche'].concat(KA.DAYS.map((d) => d.slice(0, 2))).map((l, i) =>
      `<button class="${ui.nutDay === i - 1 ? 'on' : ''}" data-act="nutday" data-v="${i - 1}">${l}</button>`).join('');
    const avg = KA.weekAvg(plan);
    const lacks = NUTRIENTS.filter((n, i) => n.group === 'micro' && avg[i] / T[n.k] < 0.7).map((n) => n.label);
    const vegan = S.prefs.diets.includes('vegan');
    return `<section class="card"><h2>Nährstoff-Bilanz <span class="opt">pro Person</span></h2>
      <div class="seg wrap">${tabs}</div>
      <h4 class="cat">Makronährstoffe</h4>${idx('macro').map(([n, i]) => row(n, i)).join('')}
      <h4 class="cat">Mikronährstoffe</h4>${idx('micro').map(([n, i]) => row(n, i)).join('')}
      <p class="muted sm">${T.known ? 'Ziele aus deinen Körperdaten.' : 'Referenzwerte für Erwachsene (ohne Körperdaten).'} Mikronährstoff-Ziele sind Tagesempfehlungen; bewertet wird der Wochendurchschnitt.</p>
      ${lacks.length ? `<p class="warn">⚠ Wochenschnitt unter 70 %: ${lacks.join(', ')}.${vegan ? ' Bei veganer Ernährung sollten Vitamin B12 (und oft Vitamin D) ergänzt werden – sprich das ggf. mit Ärzt:in ab.' : lacks.includes('Vitamin D') ? ' Vitamin D wird bei uns kaum über Essen gedeckt (Sonne/Supplement).' : ''}</p>` : ''}
    </section>`;
  }

  function viewPlan() {
    const p = S.prefs;
    const plan = S.plan;
    const T = KA.targets(p);
    const stale = plan && plan.sig !== KA.planSig(p);
    let body = '';
    if (ui.planError) body += `<div class="card err">${esc(ui.planError)}</div>`;
    if (!plan) {
      body += `<section class="card center"><h2>Dein Wochenplan</h2><p class="muted">Erstellt aus deinen Präferenzen${T.known ? ' und Körperdaten' : ''} sieben Tage Mahlzeiten, die Makro- und Mikronährstoffe möglichst gut abdecken.</p>
        <p class="tgt">Ziel: ${KA.fmtNum(T.kcal, 0)} kcal${T.known ? '' : ' (Referenz – Körperdaten sind optional im Profil)'}</p>
        <button class="btn big" data-act="genplan">Wochenplan erstellen</button></section>`;
    } else {
      const slots = KA.activeSlots(p);
      body += `<section class="card bar-actions"><div><b>Ziel:</b> ${KA.fmtNum(T.kcal, 0)} kcal · ${T.prot} g Eiweiß${T.known ? '' : ' <span class="muted">(Referenz)</span>'}</div>
        <div class="btnrow"><button class="btn" data-act="genplan">🎲 Alles neu würfeln</button><span class="muted sm">🔒 gesperrte Mahlzeiten bleiben</span></div></section>`;
      if (stale) body += '<div class="card warnbox">Deine Präferenzen haben sich seit der Erstellung geändert. Erstelle den Plan neu, damit sie berücksichtigt werden.</div>';
      body += `<div class="week">${plan.days.map((day, d) => {
        const dv = KA.dayVec(day);
        return `<section class="day ${ui.nutDay === d ? 'cur' : ''}"><header data-act="nutday" data-v="${d}"><b>${KA.DAYS[d]}</b><span>${r0(dv[0])} kcal</span></header>
          ${day.map((m) => {
            const r = REC[m.rid];
            const kcal = KA.mealVec(m)[0];
            return `<div class="meal ${m.lock ? 'locked' : ''}"><div class="slot">${MEALS[m.slot].label}</div>
              <button class="mname" data-act="view" data-id="${r.id}" data-f="${m.f}">${esc(r.name)}</button>
              <div class="mmeta">⏱ ${r.time} Min. · ${dots(r.diff)} · ${r0(kcal)} kcal · ${portion(m.f)}× Portion</div>
              <div class="mbtn"><button data-act="reroll" data-d="${d}" data-s="${m.slot}" title="Neu würfeln (Reroll)">🎲</button>
              <button data-act="swap" data-d="${d}" data-s="${m.slot}" title="Gericht tauschen">⇄</button>
              <button class="${m.lock ? 'on' : ''}" data-act="lock" data-d="${d}" data-s="${m.slot}" title="Mahlzeit sperren">${m.lock ? '🔒' : '🔓'}</button></div></div>`;
          }).join('')}</section>`;
      }).join('')}</div>`;
      body += nutPanel(plan, T);
      body += `<section class="card"><h2>Einkaufsliste zum Plan</h2>
        ${pMode() === 'off' ? '<p class="muted sm">Ohne Vorrat: Alle Zutaten kommen auf die Liste.</p>' : `<label class="switch"><input type="checkbox" data-bind="subPantry" ${S.subPantry ? 'checked' : ''}><span>${pMode() === 'simple' ? 'Abgehakte Lebensmittel aus „Mein Vorrat“ weglassen' : 'Vorhandene Mengen aus „Mein Vorrat“ abziehen'} (${pIds().length} Artikel)</span></label>`}
        <p class="muted sm">Mengen für ${p.persons} Person${p.persons > 1 ? 'en' : ''} (siehe Profil).</p>
        <button class="btn" data-act="toplanlist">${S.blocks.plan ? 'Auf der Einkaufsliste aktualisieren →' : 'Auf die Einkaufsliste →'}</button></section>`;
      void slots;
    }
    return pageHead('Wochenplan', 'Sieben Tage, abgestimmt auf Präferenzen und Nährstoffbedarf.') + prefsCard() + planSettings() + body;
  }

  /* ---------- Tab: Einkauf & Bestellung ---------- */
  function orderPanel() {
    const o = S.order;
    const prov = KA.Providers[o.provider];
    const cfg = (o.cfg[o.provider] = o.cfg[o.provider] || {});
    const f = prov.fields.map((fl) => {
      const path = `order.cfg.${o.provider}.${fl.k}`;
      if (fl.type === 'checkbox') return `<label class="switch"><input type="checkbox" data-bind="${path}" ${cfg[fl.k] ? 'checked' : ''}><span>${esc(fl.label)}</span></label>`;
      if (fl.type === 'select') return `<label>${esc(fl.label)}<select data-bind="${path}">${fl.options.map((x) => `<option ${cfg[fl.k] === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`;
      return `<label>${esc(fl.label)}<input type="${fl.type || 'text'}" placeholder="${esc(fl.placeholder || '')}" value="${esc(cfg[fl.k] || '')}" data-bind="${path}" autocomplete="off"></label>`;
    }).join('');
    const c = o.customer;
    const cf = [['name', 'Name'], ['street', 'Straße & Nr.'], ['zip', 'PLZ'], ['city', 'Ort']].map(([k, l]) =>
      `<label>${l}<input value="${esc(c[k])}" data-bind="order.customer.${k}"></label>`).join('');
    const items = cartItems();
    const prev = ui.preview ? `<pre class="json">${esc(JSON.stringify(prov.preview(items, cfg, c), null, 2))}</pre>` : '';
    const r = ui.orderResult;
    const res = r ? `<div class="card ${r.ok ? 'okbox' : 'err'}">${esc(r.message)}${r.lines && r.lines.length
      ? `<ul class="olines">${r.lines.map((l) => `<li class="${l.ok ? '' : 'bad'}">${l.ok ? '✓' : '✗'} ${esc(l.text)}</li>`).join('')}</ul>` : ''}</div>` : '';
    if (prov.needsZip) {
      // REWE: füllt nur den Warenkorb; Postleitzahl wird nach dem Klick abgefragt, bestellt wird auf rewe.de
      return `<section class="card"><h2>Bestellen</h2>
        <label>Anbieter / Schnittstelle<select data-bind="order.provider">${Object.entries(KA.Providers).map(([k, v]) => `<option value="${k}" ${o.provider === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
        <p class="muted sm">${esc(prov.help)}</p>
        <div class="grid2">${f}</div>
        <div class="btnrow"><button class="btn ghost" data-act="preview">${ui.preview ? 'Anfrage ausblenden' : 'Anfrage ansehen'}</button>
        <button class="btn" data-act="order" ${ui.ordering ? 'disabled' : ''}>${ui.ordering ? 'Warenkorb wird gefüllt …' : 'Bei REWE in den Warenkorb …'}</button></div>
        ${ui.ordering ? `<p class="muted" id="order-progress">${esc(ui.orderProgress || 'Verbindung zur REWE-Bridge …')}</p>` : ''}
        ${prev}${res}</section>`;
    }
    return `<section class="card"><h2>Bestellen</h2>
      <label>Anbieter / Schnittstelle<select data-bind="order.provider">${Object.entries(KA.Providers).map(([k, v]) => `<option value="${k}" ${o.provider === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
      <p class="muted sm">${esc(prov.help)}</p>
      <div class="grid2">${f}</div>
      <h4 class="cat">Lieferadresse</h4><div class="grid4">${cf}</div>
      <div class="btnrow"><button class="btn ghost" data-act="preview">${ui.preview ? 'Anfrage ausblenden' : 'Anfrage ansehen'}</button>
      <button class="btn" data-act="order" ${ui.ordering ? 'disabled' : ''}>${ui.ordering ? 'Sende …' : 'Jetzt bestellen'}</button></div>
      ${prev}${res}
      <p class="muted sm">API-Schlüssel werden nur lokal im Browser gespeichert. Für den Echtbetrieb den Schlüssel besser serverseitig halten (siehe README, Proxy-Modus).</p></section>`;
  }

  const resetCard = () => '<div class="btnrow"><button class="btn ghost" data-act="reset">Alle gespeicherten Daten zurücksetzen</button></div>';

  // Die eine Einkaufsliste der App. Sie setzt sich zusammen aus den Rezepten, die über „+ Liste“ gewählt wurden
  // (S.list, Portionen änderbar), der übernommenen Rezept-Auswahl und dem übernommenen Wochenplan (S.blocks,
  // jeweils ein Stand zum Zeitpunkt der Übernahme, Vorrat schon abgezogen) sowie eigenen Artikeln (S.extras).
  // Gleiche Lebensmittel werden zusammengefasst. checked = noch zu kaufen (nicht abgehakt).
  function cartItems() {
    const map = {};
    const put = (id, name, unit, cat, qty, from, extra) => {
      const key = extra ? 'e|' + KA.norm(name) : id ? 'i|' + id : 'x|' + KA.norm(name) + '|' + (unit || '');
      const a = map[key] || (map[key] = { key, id: id || null, name: id ? ING[id].name : name, unit: id ? ING[id].unit : unit || '', cat: id ? ING[id].cat : cat || 'SO', qty: 0, from: [], extra: !!extra });
      if (qty) a.qty += qty;
      [].concat(from || []).forEach((f) => { if (!a.from.includes(f)) a.from.push(f); });
    };
    bookAgg().forEach((a) => put(a.id, a.name, a.unit, a.cat, a.qty, a.from, a.extra));
    [['finder', 'Rezept-Auswahl'], ['plan', 'Wochenplan']].forEach(([k, label]) => {
      const b = S.blocks[k];
      if (b) b.items.forEach((i) => put(i.id && ING[i.id] ? i.id : null, i.name, i.unit, i.cat, i.amount, label));
    });
    const order = Object.keys(CATS);
    return Object.values(map).map((a) => {
      const amount = a.id ? KA.buyAmount(a.id, a.qty) : a.qty ? Math.round(a.qty * 100) / 100 : null;
      return { key: a.key, id: a.id, name: a.name, cat: a.cat, unit: a.unit, amount, price: a.id ? KA.price(a.id, amount) : 0,
        label: a.id ? '' : a.qty ? fmtQ(a.qty, a.unit) : '', from: a.from, extra: a.extra, checked: !S.done[a.key] };
    }).filter((i) => !i.id || i.amount > 0)
      .sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || a.name.localeCompare(b.name, 'de'));
  }
  const cartOpen = () => cartItems().filter((i) => i.checked);

  function cartHTML(items) {
    let html = '', cat = null;
    items.forEach((it) => {
      if (it.cat !== cat) { if (cat) html += '</ul>'; cat = it.cat; html += `<h4 class="cat">${esc(CATS[cat])}</h4><ul class="slist">`; }
      html += `<li class="${it.checked ? '' : 'off'}">
        <label class="chk" title="Abhaken, wenn erledigt"><input type="checkbox" data-act="listchk" data-k="${esc(it.key)}" ${it.checked ? '' : 'checked'}><span></span></label>
        <span class="nm">${esc(it.name)}<small>${esc(it.from.join(', '))}</small></span><span class="am">${it.id ? KA.fmtAmount(it.id, it.amount) : esc(it.label)}</span>
        <span class="pr">${it.id ? KA.fmtEUR(it.price) : ''}</span>
        ${it.extra ? `<button class="x" data-act="extradel" data-n="${esc(it.name)}" title="Entfernen">✕</button>` : '<span class="x"></span>'}</li>`;
    });
    return html + (cat ? '</ul>' : '');
  }

  function viewShop() {
    const items = cartItems(), open = items.filter((i) => i.checked);
    const b = S.blocks;
    const when = (t) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const block = (k, title, act) => (b[k] ? `<div class="dr-rec"><span class="t">${title} <small class="muted">Stand ${when(b[k].created)}</small></span>
      <button class="btn ghost sm" data-act="${act}">Aktualisieren</button><button class="x" data-act="blockdel" data-v="${k}" title="Von der Liste nehmen">×</button></div>` : '');
    const hasSel = S.sel.some((id) => REC[id]);
    const sources = `<section class="card noprint"><h2>Woraus die Liste besteht</h2>
      <div class="srcs">${S.list.map((l) => `<div class="dr-rec"><span class="t">${esc(bookRecipe(l.id).title)}</span>
          <div class="step sm"><button data-act="listserv" data-id="${esc(l.id)}" data-d="-1" aria-label="Weniger">−</button><span>${l.serv} Pers.</span><button data-act="listserv" data-id="${esc(l.id)}" data-d="1" aria-label="Mehr">+</button></div>
          <button class="x" data-act="listdel" data-id="${esc(l.id)}" title="Von der Liste nehmen">×</button></div>`).join('')}
        ${block('finder', 'Rezept-Auswahl' + (b.finder && b.finder.names ? ': ' + esc(b.finder.names.join(', ')) : ''), 'tofinderlist')}${block('plan', 'Wochenplan', 'toplanlist')}</div>
      ${S.list.length || b.finder || b.plan ? '' : '<p class="muted">Noch keine Rezepte. Füge welche im Rezeptbuch über „+ Liste“ hinzu, übernimm eine Rezept-Auswahl oder den Wochenplan.</p>'}
      <div class="addrow"><input id="extra-in" placeholder="Eigenen Artikel hinzufügen, z. B. Küchenrolle" autocomplete="off"><button class="btn ghost" data-act="addextra">Hinzufügen</button></div>
      <div class="btnrow">${S.plan && !b.plan ? '<button class="btn ghost" data-act="toplanlist">Wochenplan übernehmen</button>' : ''}
        ${hasSel && !b.finder ? '<button class="btn ghost" data-act="tofinderlist">Rezept-Auswahl übernehmen</button>' : ''}</div></section>`;
    if (!items.length) return pageHead('Einkaufsliste', 'Alles, was du einkaufen willst – an einer Stelle.') + sources;
    const list = `<section class="card printable"><div class="lh"><h2>Einkaufsliste</h2><span class="muted sm">${new Date().toLocaleDateString('de-DE')}</span></div>
      <div class="plist">${cartHTML(items)}</div>
      <div class="total">Geschätzt (${open.length} Artikel offen): <b>${KA.fmtEUR(listTotal(items))}</b> <span class="muted sm">· Preise sind grobe Richtwerte</span></div>
      <div class="btnrow noprint"><button class="btn ghost" data-act="copy">Kopieren</button><button class="btn ghost" data-act="csv">CSV</button><button class="btn ghost" data-act="print">Drucken</button>
        ${items.length > open.length ? '<button class="btn ghost" data-act="listreset">Häkchen zurücksetzen</button>' : ''}
        <button class="btn ghost" data-act="listclean" ${items.length === open.length ? 'disabled' : ''}>Aufräumen</button></div></section>`;
    return pageHead('Einkaufsliste', `${open.length} von ${items.length} Artikeln offen – abhaken, drucken oder bei REWE in den Warenkorb legen.`) + sources + list + (open.length ? orderPanel() : '');
  }

  const viewPantry = () => pageHead('Vorrat', 'Was du zu Hause hast – wird bei Rezeptvorschlägen und Einkaufslisten berücksichtigt.') + pantryCard() + resetCard();

  /* ---------- Rezeptbuch: Bibliothek, Detail, eigene Rezepte ---------- */
  const pageHead = (title, sub, extra) => `<div class="ph"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${extra || ''}</div>`;
  const BOOK_CATS = KA.BOOK_CATS;
  const TONES = [['#FDE9DF', '#F9DCCD'], ['#E3F3E8', '#D4ECDC'], ['#FFF1D6', '#FBE6BE'], ['#E6EEF8', '#D8E4F3'], ['#EEF5E0', '#E2EECC'], ['#F7E6EE', '#F0D7E3']];
  const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const persons = (n) => n + (n === 1 ? ' Person' : ' Personen');

  // Menge frei eingetragener Zutaten (ohne Stammdaten) anzeigen, kleine Mengen als Bruch
  function fmtQ(q, unit) {
    if (q == null || q === '') return unit || '';
    let s;
    if ((unit === 'g' || unit === 'ml') && q >= 50) s = String(Math.round(q / 5) * 5);
    else if (q >= 10) s = String(Math.round(q));
    else {
      let r = Math.round(q * 4) / 4;
      if (r === 0) r = 0.25;
      const w = Math.floor(r), f = +(r - w).toFixed(2);
      s = (w ? String(w) : '') + (FR[f] || '');
    }
    return (s + ' ' + (unit || '')).trim();
  }

  // „200 g Mehl“ -> { qty, unit, name }
  function parseLine(t) {
    t = t.trim();
    const m = t.match(/^([\d.,½¼¾\/]+)?\s*(kg|g|ml|l|EL|TL|Stk|Stück|Zehen?|Prisen?|Bund|Dosen?|Becher|Pck|Packung)?\.?\s+(.+)$/i);
    if (!m || (!m[1] && !m[2])) return { qty: null, unit: '', name: t };
    let q = null;
    if (m[1]) {
      const v = m[1].replace('½', '.5').replace('¼', '.25').replace('¾', '.75').replace(',', '.');
      q = v.includes('/') ? +v.split('/')[0] / +v.split('/')[1] : parseFloat(v);
    }
    return { qty: isFinite(q) && q !== null ? q : null, unit: m[2] || (q != null ? 'Stk' : ''), name: m[3].trim() };
  }

  // Verknüpft eine freie Zutat mit den Stammdaten, wenn Name und Einheit eindeutig passen
  // (dann greifen Kategorien, Preise und das Zusammenfassen auf der Einkaufsliste).
  // Ergebnis: die Zutat wie eingetippt (qty, unit, name) plus id des Lebensmittels und base = Menge in dessen
  // Grundeinheit (g, ml oder Stk). base ist null, wenn sich die Einheit nicht umrechnen lässt.
  let nameIndex = null;
  function findFood(name) {
    if (!nameIndex) {
      nameIndex = {};
      const put = (n, i) => { const k = KA.norm(n); if (k && !nameIndex[k]) nameIndex[k] = i; };
      Object.values(ING).forEach((i) => put(i.name, i));
      Object.values(ING).forEach((i) => (i.meta.a || []).forEach((n) => put(n, i)));
    }
    const n = KA.norm(name);
    const head = n.split(/[,(]/)[0].trim(); // „Paprikapulver, edelsüß“ -> „paprikapulver“
    const words = head.split(/\s+/);
    const tries = [n, head, head.replace(/^bio[- ]?/, ''), words.length > 1 ? words[words.length - 1] : '']; // „rote Zwiebel“ -> „zwiebel“
    for (const t of tries) if (t && nameIndex[t]) return nameIndex[t];
    return null;
  }
  const UNIT_KEY = { g: 'g', kg: 'kg', ml: 'ml', l: 'l', el: 'el', tl: 'tl', prise: 'prise', prisen: 'prise', bund: 'bund', dose: 'dose', dosen: 'dose',
    becher: 'becher', pck: 'pck', packung: 'pck', stk: 'stk', 'stück': 'stk', zehe: 'stk', zehen: 'stk' };
  // Haushaltsmaße sind Näherungen (Gewichte je Lebensmittel in data.js, KA.ING_META)
  function toBaseAmount(ing, qty, unit) {
    const u = UNIT_KEY[(unit || 'stk').toLowerCase()];
    const m = ing.meta;
    if (ing.unit === 'Stk') return u === 'stk' ? qty : u === 'g' ? qty / ing.gpu : u === 'kg' ? (qty * 1000) / ing.gpu : null;
    if (u === 'g' || u === 'ml') return qty; // bei Flüssigkeiten 1 g ≈ 1 ml
    if (u === 'kg' || u === 'l') return qty * 1000;
    const tl = ing.unit === 'ml' ? 5 : m.tl;
    if (u === 'tl' && tl) return qty * tl;
    if (u === 'el' && tl) return qty * tl * 3;
    if (u === 'prise' && ing.unit === 'g') return qty * 0.4;
    if (m[u]) return qty * m[u];
    return null;
  }
  function linkIng(p) {
    const ing = findFood(p.name);
    const out = { qty: p.qty, unit: p.unit, name: p.name };
    if (!ing) return out;
    out.id = ing.id;
    out.base = p.qty == null ? null : toBaseAmount(ing, p.qty, p.unit);
    return out;
  }

  const hash = (s) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const builtinCat = (r) => (r.types.includes('m') || r.types.includes('a') ? 'Hauptgericht' : r.types.includes('f') ? 'Frühstück' : 'Snack');
  // Standardbild je Kategorie (für eigene Rezepte ohne Foto)
  const CAT_IMG = { 'Frühstück': 'pancakes:teig,honig,beere', Hauptgericht: 'teller:sosse,kartoffel,kraut', Snack: 'dip:creme,karotte,kraut',
    Backen: 'kuchen:teig,sahne,kruste', Nachtisch: 'dessert:beere,vanille,sahne', 'Getränke': 'glas:orange,keine,zitrone' };
  // Rezeptbuch-Rezepte aus rezepte.js (Zutaten als Text, werden einmalig zerlegt)
  let bookMap = null;
  function bookData() {
    if (bookMap) return bookMap;
    bookMap = {};
    KA.BOOK.forEach((b) => {
      bookMap[b.id] = { id: b.id, title: b.title, cat: b.cat, cuisine: b.cuisine, diff: b.diff, time: b.time, serv: b.serv, source: 'Kochapp', builtin: true,
        tone: hash(b.id) % TONES.length, image: KA.dishImage(b.img, b.id), ings: b.ings.map((t) => linkIng(parseLine(t))), steps: b.steps };
    });
    return bookMap;
  }
  // Einheitliche Sicht auf mitgelieferte und eigene Rezepte
  function bookRecipe(id) {
    const r = REC[id];
    if (!r || r.user || r.book) return bookData()[id] || S.my.find((x) => x.id === id) || null;
    const meta = KA.BUILTIN_META[id] || {};
    const cat = meta.cat || builtinCat(r);
    return {
      id, title: r.name, cat, cuisine: r.k, time: r.time, serv: r.s, source: 'Kochapp', builtin: true,
      tone: hash(id) % TONES.length, image: KA.dishImage(meta.img || CAT_IMG[cat], id),
      ings: r.i.map(([iid, a]) => ({ id: iid, qty: a, base: a, unit: ING[iid].unit, name: ING[iid].name, std: true })), steps: r.st,
    };
  }
  const builtins = () => KA.RECIPES.filter((r) => !r.user && !r.book);
  const allBook = () => S.my.concat(builtins().map((r) => bookRecipe(r.id)), Object.values(bookData()));

  // Eigene Rezepte in Finder und Wochenplan bereitstellen; Verweise auf gelöschte Rezepte aufräumen
  let usableMine = 0;
  // Eigene Lebensmittel (S.foods: vom Nutzer eingetragene oder im Internet gefundene Nährwerte) in die Stammdaten
  // aufnehmen. Liefert true, wenn sich etwas geändert hat – dann müssen Zutaten neu verknüpft werden.
  let foodsSig = null;
  function registerFoods() {
    const sig = JSON.stringify(S.foods);
    if (sig === foodsSig) return false;
    foodsSig = sig;
    Object.keys(ING).forEach((id) => { if (ING[id].custom) delete ING[id]; });
    S.foods.forEach((f) => {
      if (ING[f.id]) return;
      ING[f.id] = { id: f.id, name: f.name, cat: 'SO', unit: f.unit, gpu: f.unit === 'Stk' ? f.gpu : 1, price: 0, flags: f.flags || [], n: f.n,
        staple: false, meta: f.tl ? { tl: f.tl } : {}, custom: true, src: f.src || '' };
    });
    nameIndex = null; bookMap = null;
    return true;
  }
  function syncRecipes() {
    const foodsChanged = registerFoods();
    // Zutaten (neu) mit den Stammdaten verknüpfen – auch für Rezepte aus älteren Versionen und nach Änderungen
    // an eigenen Lebensmitteln (Einheit geändert oder gelöscht)
    S.my.forEach((r) => {
      r.ings = r.ings.map((i) => {
        if (i.id && (!ING[i.id] || (foodsChanged && ING[i.id].custom))) return linkIng(i);
        return i.id && i.base === undefined ? Object.assign({}, i, { base: i.qty }) : i.id ? i : linkIng(i);
      });
    });
    // Rezeptbuch-Rezepte in die Rezeptfindung übernehmen (beim Start und wenn eigene Lebensmittel sie neu verknüpfen)
    if (!bookMap) KA.setBookRecipes(Object.values(bookData()));
    usableMine = KA.setUserRecipes(S.my);
    S.sel = S.sel.filter((id) => REC[id]);
    if (S.plan && S.plan.days.some((day) => day.some((m) => !REC[m.rid]))) S.plan = null;
  }

  // Zutaten ohne Stammdaten aus eigenen Rezepten als freie Artikel für die Einkaufsliste; entries: [{ rid, k }]
  function freeItems(entries) {
    const agg = {};
    entries.forEach(({ rid, k }) => (REC[rid].free || []).forEach((i) => {
      const key = KA.norm(i.name) + '|' + (i.unit || '');
      const a = agg[key] || (agg[key] = { name: i.name, unit: i.unit || '', qty: 0 });
      if (i.qty != null) a.qty += i.qty * k;
    }));
    return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name, 'de')).map((a) =>
      ({ id: null, name: a.name, cat: 'SO', amount: a.qty ? Math.round(a.qty * 100) / 100 : null, unit: a.unit, label: a.qty ? fmtQ(a.qty, a.unit) : '', price: 0, checked: true }));
  }
  const finderList = (sel, pantry) => KA.shoppingForRecipes(sel, pantry, S.prefs)
    .concat(freeItems(sel.map((rid) => ({ rid, k: (S.prefs.persons || 2) / REC[rid].s }))));
  const planList = () => KA.planShopping(S.plan, S.prefs, pantryEff(), S.subPantry && pMode() !== 'off')
    .concat(freeItems(S.plan.days.reduce((all, day) => all.concat(day.map((m) => ({ rid: m.rid, k: (m.f * (S.prefs.persons || 1)) / REC[m.rid].s }))), [])));
  const srcLabel = (r) => (r.source === 'Web' ? 'Web · ' + r.domain : r.source);
  // mitgelieferte Rezepte in Stammdaten-Einheiten, eigene so, wie sie eingetippt wurden
  const ingQty = (i, f) => (i.qty == null ? i.unit || '' : i.std ? KA.fmtAmount(i.id, i.base * f) : fmtQ(i.qty * f, i.unit));
  const toneStyle = (r) => `--a:${TONES[r.tone % TONES.length][0]};--b:${TONES[r.tone % TONES.length][1]}`;
  const recImg = (r) => `<img src="${esc(r.image || KA.dishImage(CAT_IMG[r.cat] || CAT_IMG.Hauptgericht, r.id))}" alt="${esc(r.title)}" loading="lazy">`;
  const catLabel = (r) => (r.builtin ? r.cat + (r.cuisine ? ' · ' + r.cuisine : '') : srcLabel(r));

  function libFiltered() {
    const q = KA.norm(ui.query);
    return allBook().filter((r) => (ui.filter === 'Alle' || (ui.filter === 'Eigene' ? !r.builtin : r.cat === ui.filter)) &&
      (ui.filter === 'Eigene' || ui.cuisine === 'Alle' || (r.cuisine || 'International') === ui.cuisine) &&
      (!q || KA.norm(r.title).includes(q) || KA.norm(r.cuisine || '').includes(q) || r.ings.some((i) => KA.norm(i.name).includes(q))));
  }
  function bookCards() {
    const list = libFiltered();
    if (!list.length) return '<p class="muted">Kein Rezept gefunden.</p>';
    return list.map((r) => {
      const inL = S.list.some((l) => l.id === r.id);
      return `<div class="bcard" role="button" tabindex="0" data-act="openrec" data-id="${esc(r.id)}">
        <div class="thumb" style="${toneStyle(r)}">${recImg(r)}</div>
        <div class="bc-t"><span>${esc(catLabel(r))}</span><b>${esc(r.title)}</b><span>${r.time} Min · ${r.serv} Pers.</span></div>
        <button class="lbtn ${inL ? 'on' : ''}" data-act="addlist" data-id="${esc(r.id)}">${inL ? '✓ Auf Liste' : '+ Liste'}</button></div>`;
    }).join('');
  }

  // Zweite Filterzeile: nach Küche (innerhalb der gewählten Kategorie)
  function cuisineChips() {
    const pool = allBook().filter((r) => ui.filter === 'Alle' || r.cat === ui.filter);
    const n = (k) => pool.filter((r) => (r.cuisine || 'International') === k).length;
    return `<div class="fchips kchips" aria-label="Küche"><span class="flabel">Küche</span>${[['Alle', pool.length]].concat(KA.KUECHEN.map((k) => [k, n(k)]).filter((x) => x[1]))
      .map(([k, c]) => `<button class="${ui.cuisine === k ? 'on' : ''}" data-act="bookcuisine" data-v="${k}">${k === 'Alle' ? 'Alle Küchen' : k} <i>${c}</i></button>`).join('')}</div>`;
  }

  function viewLibrary() {
    const n = S.my.length + builtins().length + KA.BOOK.length;
    return `<div class="ph"><div><h1>Meine Rezepte</h1><p>${n} Rezepte · ${S.my.length} eigene</p></div>
        <input id="bk-q" class="search" value="${esc(ui.query)}" aria-label="Rezept oder Zutat suchen" placeholder="Rezept oder Zutat suchen …" autocomplete="off"></div>
      <div class="fchips">${['Alle'].concat(BOOK_CATS, ['Eigene']).map((f) => `<button class="${ui.filter === f ? 'on' : ''}" data-act="bookfilter" data-v="${f}">${f}</button>`).join('')}</div>
      ${ui.filter === 'Eigene' ? '' : cuisineChips()}
      <div class="bgrid" id="bk-cards">${bookCards()}</div>`;
  }

  // Nährwerte einer Portion, zusammengerechnet aus den Zutaten (Werte je 100 g aus den Stammdaten)
  function nutritionCard(r, base) {
    if (!base) return `<div class="card ingcard"><h2>Nährwerte</h2><p class="muted">Für dieses Rezept lassen sich keine Nährwerte berechnen: Keine Zutat wurde als bekanntes Lebensmittel mit Menge erkannt.</p>${unknownFoods(r)}</div>`;
    const n = KA.recipeNutr(base);
    const T = KA.targets(S.prefs);
    const rows = NUTRIENTS.map((nu, i) => {
      const pct = (n[i] / T[nu.k]) * 100;
      return `<div class="nurow"><span>${nu.label}</span><b>${KA.fmtNum(n[i], n[i] < 10 ? 1 : 0)} ${nu.unit}</b><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div><span class="muted">${r0(pct)} %</span></div>`;
    }).join('');
    // eigene Rezepte: offenlegen, welche Zutaten in die Rechnung eingehen
    const open = r.ings.filter((i) => !(i.id && i.base > 0)).map((i) => i.name);
    const counted = r.builtin && !open.length ? '' : `<p class="${open.length ? 'warn' : 'muted sm'}">${r.ings.length - open.length} von ${r.ings.length} Zutaten berücksichtigt${
      open.length ? ` – nicht eingerechnet: ${esc(open.join(', '))}. Die tatsächlichen Werte liegen höher.` : '.'}</p>`;
    const own = r.ings.some((i) => i.id && ING[i.id] && ING[i.id].custom);
    return `<div class="card ingcard"><div class="lh"><h2>Nährwerte</h2><span class="muted sm">pro Portion · % vom Tagesbedarf</span></div>${rows}${counted}${unknownFoods(r)}
      <p class="muted sm">Berechnet aus den Zutaten. Lebensmittelwerte: Schweizer Nährwertdatenbank (BLV), geprüft gegen USDA FoodData Central${own ? '; eigene Lebensmittel nach deinen Angaben bzw. Open Food Facts' : ''}. Näherungswerte, keine Ernährungsberatung.</p></div>`;
  }
  // Zutaten eigener Rezepte, die die App nicht kennt: Nährwerte lassen sich nachtragen oder im Internet suchen
  function unknownFoods(r) {
    if (r.builtin) return '';
    const names = r.ings.filter((i) => !i.id).map((i) => i.name).filter((n, k, a) => a.indexOf(n) === k);
    if (!names.length) return '';
    return `<div class="fd-open"><span class="muted sm">Nährwerte nachtragen oder im Internet suchen:</span>
      ${names.map((n) => `<button class="lk" data-act="fdnew" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>`;
  }

  function viewDetail() {
    const r = bookRecipe(ui.selId);
    const f = ui.detailServ / r.serv;
    const inL = S.list.find((l) => l.id === r.id);
    const base = REC[r.id] || null; // fehlt bei eigenen Rezepten ohne erkannte Zutat
    const fact = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    return `<div class="detail">
      <button class="back" data-act="booklib">← Alle Rezepte</button>
      <div class="dt-top"><div class="dt-info">
        <div class="pills2"><span class="acc">${esc(r.cat)}</span>${r.cuisine ? `<span class="acc">${esc(r.cuisine)}</span>` : ''}<span>${esc(srcLabel(r))}</span></div>
        <h1>${esc(r.title)}</h1>
        ${r.sourceUrl && /^https?:\/\//i.test(r.sourceUrl) ? `<p class="muted sm"><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Originalrezept öffnen</a></p>` : ''}
        <div class="facts">${fact('Zeit', r.time + ' Min')}${fact('Zutaten', r.ings.length)}${fact('Original', r.serv + ' Pers.')}
          ${base ? (base.i.length ? fact('Pro Portion', (base.partial ? 'mind. ' : '') + r0(KA.recipeNutr(base)[0]) + ' kcal') : '') + fact('Niveau', DIFF[base.diff]) : ''}</div>
        ${base ? `<div class="tags">${recipeTags(base, true)}</div>` : ''}
        <div class="servbox"><span class="muted">Portionen</span>
          <div class="step"><button data-act="dserv" data-d="-1" aria-label="Weniger">−</button><span>${persons(ui.detailServ)}</span><button data-act="dserv" data-d="1" aria-label="Mehr">+</button></div>
          <button class="btn dark" data-act="addlistd">${inL ? (inL.serv === ui.detailServ ? '✓ Auf der Liste' : 'Liste aktualisieren') : 'Auf Einkaufsliste'}</button></div>
        ${r.builtin ? '' : `<p class="muted sm">${base ? 'Im Vorrats-Finder und Wochenplan nutzbar.' : 'Nicht im Vorrats-Finder und Wochenplan nutzbar: Keine Zutat wurde als bekanntes Lebensmittel mit Menge erkannt.'}</p>`}
      </div><div class="dt-img" style="${toneStyle(r)}">${recImg(r)}</div></div>
      <div class="dt-body">
        <div class="col"><div class="card ingcard"><div class="lh"><h2>Zutaten</h2><span class="muted sm">für ${persons(ui.detailServ)}</span></div>
          ${r.ings.map((i) => `<div class="irow"><span class="${f !== 1 ? 'chg' : ''}">${esc(ingQty(i, f))}</span><span>${esc(i.name)}</span></div>`).join('')}</div>
        ${nutritionCard(r, base && base.i.length ? base : null)}</div>
        <div><h2>Zubereitung</h2>
          ${r.steps.length ? r.steps.map((s, k) => `<div class="srow"><span>${k + 1}</span><p>${esc(s)}</p></div>`).join('') : '<p class="muted">Keine Schritte hinterlegt.</p>'}
          ${r.builtin ? '' : '<div class="btnrow"><button class="btn ghost" data-act="delrec">Rezept löschen</button></div>'}</div>
      </div></div>`;
  }

  /* ---------- Neues Rezept: selbst schreiben, Foto-Scan (Demo), Linkimport ---------- */
  const SCAN = { title: 'Kartoffelsalat nach Tante Hilde', serv: 6, time: 45, cat: 'Hauptgericht',
    ings: [{ text: '1 kg Kartoffeln' }, { text: '1 Stk Zwiebel' }, { text: '150 ml Gemüsebrühe' }, { text: '3 EL Weißweinessig' },
      { text: '1 EL Senf', flag: true, note: 'Menge war schwer lesbar – „1 EL“ oder „4 EL“?' }, { text: '4 EL Sonnenblumenöl' }, { text: '1 Bund Schnittlauch' }],
    steps: ['Kartoffeln mit Schale gar kochen, pellen und noch warm in Scheiben schneiden.', 'Zwiebel fein würfeln und in der Brühe kurz aufkochen.',
      'Brühe mit Essig, Senf und Öl verrühren und über die warmen Kartoffeln gießen.', 'Mindestens 30 Minuten ziehen lassen, mit Schnittlauch bestreuen.'] };
  const ADD_MODES = [['manual', '01', 'Selbst schreiben', 'Zutaten einfach eintippen – Mengen werden automatisch erkannt.'],
    ['photo', '02', 'Foto scannen (Demo)', 'Demo mit einem Beispielrezept; keine echte Texterkennung.'],
    ['link', '03', 'Linkimport', 'Rezeptlink einfügen, Angaben prüfen und speichern.']];
  let demoTimer;

  const linkHint = (l) => (!l.id ? `· kein bekanntes Lebensmittel – ohne Nährwerte <button class="lk" data-act="fdnew" data-n="${esc(l.name)}">Nährwerte hinzufügen</button>`
    : l.base > 0 ? `✓ Nährwerte: ${esc(ING[l.id].name)} (≈ ${esc(KA.fmtAmount(l.id, l.base))})`
      : `· ${esc(ING[l.id].name)} erkannt, aber ${l.qty == null ? 'ohne Menge' : 'Einheit nicht umrechenbar'} – ohne Nährwerte`);
  const previewHTML = (text) => {
    if (!text.trim()) return '';
    const p = parseLine(text);
    return `<span>Erkannt:</span><b>${esc(p.qty != null ? fmtQ(p.qty, '') : '–')}</b><b>${esc(p.unit || '–')}</b><b>${esc(p.name)}</b>
      <span>${linkHint(linkIng(p))}</span>`;
  };
  const stepList = (steps, removable) => steps.map((s, k) => `<div class="lrow st"><span class="no">${k + 1}</span><span>${esc(s)}</span>${removable ? `<button class="x" data-act="delstep" data-i="${k}" title="Entfernen">×</button>` : ''}</div>`).join('');
  const ingList = (ings, removable) => ings.map((i, k) => `<div class="lrow"><b>${esc(ingQty(i, 1))}</b><span>${esc(i.name)}${
    removable && !linkIng(i).id ? ` <button class="lk" data-act="fdnew" data-n="${esc(i.name)}">+ Nährwerte</button>` : ''}</span>${removable ? `<button class="x" data-act="deling" data-i="${k}" title="Entfernen">×</button>` : ''}</div>`).join('');

  function addManual() {
    const d = ui.draft;
    return `<div class="card addcard">
      <div class="am-top"><div class="col">
        <label>Titel<input id="d-title" class="title-in" value="${esc(d.title)}" placeholder="z. B. Sonntagsbraten" autocomplete="off"></label>
        <div class="frow">
          <div class="fgroup"><div class="flabel">Portionen</div><div class="step"><button data-act="dstep" data-d="-1" aria-label="Weniger">−</button><span>${d.serv}</span><button data-act="dstep" data-d="1" aria-label="Mehr">+</button></div></div>
          <label>Zeit (Min)<input id="d-time" class="narrow" inputmode="numeric" value="${esc(d.time)}" placeholder="30"></label>
          <div class="fgroup"><div class="flabel">Kategorie</div><div class="fchips">${BOOK_CATS.map((c) => `<button class="${d.cat === c ? 'on' : ''}" data-act="dcat" data-v="${c}">${c}</button>`).join('')}</div></div>
          <div class="fgroup"><div class="flabel">Schwierigkeit</div><div class="seg">${[1, 2, 3].map((v) => `<button class="${d.diff === v ? 'on' : ''}" data-act="ddiff" data-v="${v}">${DIFF[v]}</button>`).join('')}</div></div>
        </div>
        <div class="fgroup"><div class="flabel">Küche <small>(optional)</small></div><div class="fchips">${KA.KUECHEN.map((k) => `<button class="${d.cuisine === k ? 'on' : ''}" data-act="dcuisine" data-v="${k}">${k}</button>`).join('')}</div></div>
        </div>
        <label class="drop">Titelbild wählen<input id="d-img" type="file" accept="image/jpeg,image/png,image/webp">${d.image ? `<img src="${esc(d.image)}" alt="Titelbild-Vorschau">` : ''}<span>JPG, PNG oder WebP – wird verkleinert gespeichert. Ohne Foto bekommt das Rezept eine passende Illustration.</span></label>
      </div>
      <div class="am-two"><div class="col">
          <div class="flabel">Zutaten</div>
          <input id="d-ing" placeholder="Tippe z. B. „200 g Mehl“ + Enter" autocomplete="off">
          <div class="prev" id="d-prev"></div>
          <div>${ingList(d.ings, true)}</div></div>
        <div class="col">
          <div class="flabel">Zubereitung</div>
          <input id="d-step" placeholder="Schritt beschreiben + Enter" autocomplete="off">
          <div>${stepList(d.steps, true)}</div></div></div>
      <div class="btnrow end"><button class="btn ghost" data-act="booklib">Abbrechen</button><button class="btn" data-act="savedraft">Rezept speichern</button></div></div>`;
  }

  function addPhoto() {
    if (ui.scanPhase === 'busy') {
      return `<div class="card addcard"><div class="scan"><div class="scanimg"><span class="cap">foto: rezeptkarte.jpg</span><i class="scanline"></i></div>
        <div class="col"><div class="big">Text wird erkannt …</div><div class="bar"><i class="scanbar"></i></div>
        <p class="muted">Foto ausrichten · Text erkennen · Titel, Zutaten und Schritte zuordnen</p></div></div></div>`;
    }
    if (ui.scanPhase === 'done') {
      const c = ui.scan;
      return `<div class="card addcard"><div class="scan done"><div class="col">
          <div class="scanimg"><i class="bx b1"></i><i class="bx b2"></i><i class="bx b3"></i><i class="bx b4"></i></div>
          <button class="back" data-act="scanreset">Demo zurücksetzen</button></div>
        <div class="col">
          <div class="warn"><b>1 Stelle prüfen</b> – die markierte Zeile war schwer lesbar. Bitte korrigieren, falls nötig.</div>
          <label>Titel<input id="s-title" class="title-in" value="${esc(c.title)}" autocomplete="off"></label>
          <p class="muted">Portionen <b>${c.serv}</b> · Zeit <b>${c.time} Min</b> · Kategorie <b>${esc(c.cat)}</b></p>
          <div class="flabel">Zutaten</div>
          ${c.ings.map((i, k) => `<input class="${i.flag ? 'flag' : ''}" data-si="${k}" value="${esc(i.text)}" autocomplete="off">${i.flag ? `<span class="note">${esc(i.note)}</span>` : ''}`).join('')}
          <div class="flabel">Zubereitung</div><div>${stepList(c.steps)}</div>
          <div class="btnrow end"><button class="btn" data-act="scansave">Ins Rezeptbuch speichern</button></div></div></div></div>`;
    }
    return `<div class="card addcard"><div class="dropbig"><div class="big">Foto-Scan ausprobieren (Demo)</div>
      <p class="muted">Diese Demo zeigt ein festes Beispielrezept. Eigene Fotos werden noch nicht verarbeitet.</p>
      <button class="btn" data-act="scanstart">Beispiel-Scan starten</button></div></div>`;
  }

  function addLink() {
    const l = ui.link;
    const r = l.recipe;
    let body = '';
    if (l.phase === 'busy') body = '<p class="muted busy" role="status">Rezeptseite wird geladen …</p>';
    if (l.error) body = `<p class="warn" role="alert">${esc(l.error)}</p>`;
    if (l.phase === 'done' && r) {
      body = `<div class="linkres"><p>Rezept erkannt. Bitte Angaben und Mengen vor dem Speichern prüfen.</p>
        <p class="muted sm">Quelle: <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.domain)}</a>${r.yieldText ? ' · Originalangabe: ' + esc(r.yieldText) : ''}</p>
        <label>Titel<input id="l-title" value="${esc(r.title)}" autocomplete="off"></label>
        <div class="frow"><label>Portionen<input id="l-serv" type="number" min="1" max="1000" step="1" value="${r.serv}"></label>
        <label>Zeit in Minuten<input id="l-time" type="number" min="0" max="10080" value="${r.time}"></label>
        <label>Kategorie<select id="l-cat">${BOOK_CATS.map(c => `<option ${c === r.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>
        <div class="am-two"><label>Zutaten (eine pro Zeile)<textarea id="l-ingredients" rows="10">${esc(r.ingredients.join('\n'))}</textarea></label>
        <label>Zubereitung (ein Schritt pro Zeile)<textarea id="l-steps" rows="10">${esc(r.steps.join('\n'))}</textarea></label></div>
        <div class="btnrow end"><button class="btn ghost" data-act="linkreset">Verwerfen</button><button class="btn" data-act="linksave">Ins Rezeptbuch speichern</button></div></div>`;
    }
    return `<div class="card addcard"><div class="col"><label for="l-url">Link zum Rezept</label>
      <div class="addrow"><input id="l-url" type="url" value="${esc(l.url)}" placeholder="https://www.chefkoch.de/rezepte/…" autocomplete="off" ${l.phase === 'busy' ? 'disabled' : ''}><button class="btn" data-act="linkfetch" ${l.phase === 'busy' ? 'disabled' : ''}>${l.phase === 'busy' ? 'Wird importiert …' : 'Rezept importieren'}</button></div>
      <span class="muted sm">Für öffentliche Rezeptseiten mit strukturierten Rezeptdaten. Manche Websites blockieren den Abruf oder stellen keine passenden Daten bereit.</span></div>${body}</div>`;
  }

  function viewAdd() {
    return pageHead('Neues Rezept', 'Wie möchtest du das Rezept hinzufügen?') +
      `<div class="addtabs">${ADD_MODES.map(([k, num, label, desc]) => `<button class="${ui.addMode === k ? 'on' : ''}" data-act="addmode" data-v="${k}"><i>${num}</i><b>${label}</b><span>${desc}</span></button>`).join('')}</div>` +
      { manual: addManual, photo: addPhoto, link: addLink }[ui.addMode]() + ownFoodsCard();
  }

  /* ---------- Eigene Lebensmittel: Nährwerte selbst eintragen oder im Internet suchen ---------- */
  const FOOD_FLAGS = [['fleisch', 'Fleisch'], ['schwein', 'Schwein'], ['fisch', 'Fisch'], ['schalentier', 'Schalentiere'], ['milch', 'Milch'], ['ei', 'Ei'],
    ['gluten', 'Gluten'], ['nuss', 'Nüsse'], ['erdnuss', 'Erdnüsse'], ['soja', 'Soja'], ['sesam', 'Sesam'], ['honig', 'Honig'], ['alkohol', 'Alkohol']];
  const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
  // Open Food Facts gibt Vitamine und Mineralstoffe in Gramm je 100 g an -> Faktor in die Einheit der App (mg bzw. µg)
  const OFF_KEYS = [['energy-kcal_100g', 1], ['proteins_100g', 1], ['carbohydrates_100g', 1], ['fat_100g', 1], ['fiber_100g', 1], ['vitamin-c_100g', 1e3],
    ['vitamin-a_100g', 1e6], ['vitamin-d_100g', 1e6], ['vitamin-b12_100g', 1e6], ['vitamin-b9_100g', 1e6], ['calcium_100g', 1e3], ['iron_100g', 1e3],
    ['magnesium_100g', 1e3], ['zinc_100g', 1e3], ['potassium_100g', 1e3]];
  const numIn = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
  const fmtIn = (x) => (x == null ? '' : String(Math.round(x * 100) / 100).replace('.', ','));

  function ownFoodsCard() {
    return `<section class="card"><div class="lh"><h2>Eigene Lebensmittel</h2><span class="muted sm">${S.foods.length} angelegt</span></div>
      <p class="muted">Kennt die App eine Zutat nicht, kannst du ihre Nährwerte selbst eintragen oder im Internet suchen. Danach wird sie in allen Rezepten mitgerechnet.</p>
      ${S.foods.map((f) => `<div class="dr-rec"><span class="t">${esc(f.name)} <small class="muted">${KA.fmtNum(f.n[0], 0)} kcal je 100 ${f.unit === 'ml' ? 'ml' : 'g'}${f.src ? ' · ' + esc(f.src.split(':')[0]) : ''}</small></span>
        <button class="btn ghost sm" data-act="fdedit" data-id="${esc(f.id)}">Bearbeiten</button></div>`).join('')}
      <div class="btnrow"><button class="btn ghost" data-act="fdnew" data-n="">+ Lebensmittel anlegen</button></div></section>`;
  }

  function foodDialog() {
    const f = ui.food;
    const per = f.unit === 'ml' ? '100 ml' : '100 g';
    const field = (i) => `<label>${NUTRIENTS[i].label} (${NUTRIENTS[i].unit})<input data-fn="${i}" inputmode="decimal" value="${esc(f.n[i])}" placeholder="${i < 5 ? '0' : '–'}" autocomplete="off"></label>`;
    const results = f.busy ? '<p class="muted busy" role="status">Suche läuft …</p>'
      : f.results == null ? ''
        : !f.results.length ? '<p class="muted">Nichts Passendes gefunden. Versuche einen anderen Begriff oder trage die Werte selbst ein.</p>'
          : `<ul class="alts">${f.results.map((p, k) => `<li><button data-act="fdpick" data-i="${k}"><b>${esc(p.name)}</b>
              <span class="muted">${esc(p.brand || 'ohne Marke')} · je 100 g: ${KA.fmtNum(p.n[0], 0)} kcal · ${KA.fmtNum(p.n[1] || 0)} g Eiweiß · ${KA.fmtNum(p.n[2] || 0)} g KH · ${KA.fmtNum(p.n[3] || 0)} g Fett</span>
              <span class="st ok">übernehmen</span></button></li>`).join('')}</ul>`;
    return `<h2>${f.id ? 'Lebensmittel bearbeiten' : 'Nährwerte hinzufügen'}</h2>
      <p class="muted">${f.id ? 'Änderungen wirken sich auf alle Rezepte mit diesem Lebensmittel aus.' : 'Dieses Lebensmittel kennt die App noch nicht. Trage die Nährwerte selbst ein (sie stehen meist auf der Packung) oder suche sie im Internet.'}</p>
      <div class="seg"><button class="${f.mode === 'manual' ? 'on' : ''}" data-act="fdmode" data-v="manual">Selbst eintragen</button><button class="${f.mode === 'web' ? 'on' : ''}" data-act="fdmode" data-v="web">Im Internet suchen</button></div>
      ${f.mode === 'web' ? `<div class="fd-web"><div class="addrow"><input id="fd-q" data-fd="q" value="${esc(f.q)}" placeholder="Suchbegriff, z. B. Halloumi" autocomplete="off"><button class="btn" data-act="fdsearch" ${f.busy ? 'disabled' : ''}>Suchen</button></div>
        <p class="muted sm">Gesucht wird bei Open Food Facts (openfoodfacts.org), einer freien Lebensmitteldatenbank. Dabei wird nur der Suchbegriff übertragen. Die Angaben dort stammen von Freiwilligen und Herstellern – bitte nach dem Übernehmen prüfen.</p>
        ${f.error ? `<p class="warn" role="alert">${esc(f.error)}</p>` : ''}${results}</div>` : ''}
      <div class="grid2"><label>Name<input data-fd="name" value="${esc(f.name)}" placeholder="z. B. Halloumi" autocomplete="off"></label>
        <label>Mengen werden angegeben in<select data-fd="unit"><option value="g" ${f.unit === 'g' ? 'selected' : ''}>Gramm</option><option value="ml" ${f.unit === 'ml' ? 'selected' : ''}>Milliliter</option><option value="Stk" ${f.unit === 'Stk' ? 'selected' : ''}>Stück</option></select></label>
        ${f.unit === 'Stk' ? `<label>Gewicht pro Stück (g)<input data-fd="gpu" inputmode="decimal" value="${esc(f.gpu)}" placeholder="z. B. 60" autocomplete="off"></label>`
          : `<label>1 Teelöffel wiegt (g) <input data-fd="tl" inputmode="decimal" value="${esc(f.tl)}" placeholder="optional – für Angaben in TL/EL" autocomplete="off"></label>`}</div>
      <h4 class="cat">Nährwerte je ${per}</h4>
      <div class="grid4">${[0, 1, 2, 3, 4].map(field).join('')}</div>
      <details data-key="fdmore" ${ui.open.has('fdmore') ? 'open' : ''}><summary>Vitamine & Mineralstoffe <span class="muted">optional – leer zählt als 0</span></summary><div class="grid4">${[5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(field).join('')}</div></details>
      <h4 class="cat">Enthält <span class="opt">für die Ernährungsfilter</span></h4>
      <div class="fchips">${FOOD_FLAGS.map(([k, l]) => `<button class="${f.flags.includes(k) ? 'on' : ''}" data-act="fdflag" data-v="${k}">${l}</button>`).join('')}</div>
      <p class="muted sm">Nichts markiert heißt: enthält nichts davon. Davon hängt ab, ob Rezepte mit diesem Lebensmittel z. B. als vegan oder glutenfrei gelten.</p>
      ${f.src ? `<p class="muted sm">Quelle: ${esc(f.src)}</p>` : ''}
      <p class="zip-err" id="fd-err" role="alert">${esc(f.warn || '')}</p>
      <div class="btnrow"><button class="btn ghost" data-act="closedlg">Abbrechen</button>${f.id ? '<button class="btn ghost" data-act="fddel">Löschen</button>' : ''}
        <button class="btn" data-act="fdsave">${f.warn ? 'Trotzdem speichern' : 'Speichern'}</button></div>`;
  }

  function openFood(name, food) {
    ui.food = food
      ? { id: food.id, name: food.name, unit: food.unit, gpu: food.unit === 'Stk' ? fmtIn(food.gpu) : '', tl: fmtIn(food.tl), n: food.n.map((x, i) => (x || i < 5 ? fmtIn(x) : '')), flags: (food.flags || []).slice(), src: food.src || '',
        mode: 'manual', q: food.name, results: null, busy: false, error: '', warn: '' }
      : { id: null, name: name || '', unit: 'g', gpu: '', tl: '', n: NUTRIENTS.map(() => ''), flags: [], src: '', mode: 'manual', q: name || '', results: null, busy: false, error: '', warn: '' };
    openDlg(foodDialog());
  }
  const redrawFood = () => { const y = $('#dlg-body').scrollTop; $('#dlg-body').innerHTML = foodDialog(); $('#dlg-body').scrollTop = y; };

  async function searchFood() {
    const f = ui.food;
    const q = f.q.trim();
    if (!q) { f.error = 'Bitte einen Suchbegriff eingeben.'; redrawFood(); return; }
    Object.assign(f, { busy: true, error: '', results: null }); redrawFood();
    try {
      const qs = new URLSearchParams({ search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '24', lc: 'de', cc: 'de',
        fields: 'code,product_name,product_name_de,brands,nutriments' });
      // Open Food Facts begrenzt Suchanfragen und antwortet bei Überlast kurzzeitig mit einem Fehler -> ein paar Mal versuchen.
      // In der Desktop-App fragt die App-Hülle an (/api/foodsearch); sie kann zusätzlich auf den zweiten Suchdienst ausweichen.
      let data = null, last = '';
      for (let attempt = 0; attempt < 3 && !data; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
        try {
          const res = await fetch(window.KA_DESKTOP ? '/api/foodsearch?q=' + encodeURIComponent(q) : OFF_SEARCH + '?' + qs);
          if (res.ok) data = await res.json(); else last = 'HTTP ' + res.status;
        } catch (e) { last = 'keine Antwort'; }
        if (ui.food !== f) return;
      }
      if (!data) throw new Error(last);
      const list = (data.products || data.hits || []).map((p) => {
        const nu = p.nutriments || {};
        const n = OFF_KEYS.map(([k, factor]) => (typeof nu[k] === 'number' ? Math.round(nu[k] * factor * 100) / 100 : null));
        if (n[0] == null && typeof nu.energy_100g === 'number') n[0] = Math.round(nu.energy_100g / 4.184); // nur kJ angegeben
        const brands = Array.isArray(p.brands) ? p.brands[0] : String(p.brands || '').split(',')[0];
        return { name: String(p.product_name_de || p.product_name || '').trim(), brand: String(brands || '').trim(), code: String(p.code || ''), n };
      }).filter((p) => p.name && p.n[0] != null && p.n[0] <= 900 && p.n[1] != null && p.n[3] != null); // nur Einträge mit vollständigen Grundangaben
      if (ui.food !== f) return; // Dialog inzwischen geschlossen oder neu geöffnet
      f.results = list.slice(0, 8);
    } catch (e) {
      if (ui.food !== f) return;
      f.error = 'Open Food Facts hat gerade nicht geantwortet (' + e.message + '). Der Dienst ist manchmal überlastet – bitte gleich noch einmal versuchen, die Internetverbindung prüfen oder die Werte selbst eintragen.';
    }
    f.busy = false; redrawFood();
  }

  function saveFood() {
    const f = ui.food;
    if (!f) return;
    const fail = (msg) => { f.warn = ''; redrawFood(); $('#fd-err').textContent = msg; };
    const name = f.name.trim();
    if (!name) return fail('Bitte einen Namen eingeben.');
    const other = findFood(name);
    if (other && other.id !== f.id && KA.norm(other.name) === KA.norm(name)) return fail(`„${other.name}“ gibt es schon.`);
    const n = f.n.map(numIn);
    if (n[0] == null) return fail('Bitte mindestens die Energie (kcal) angeben.');
    if (n.some((x) => x != null && x < 0)) return fail('Nährwerte können nicht negativ sein.');
    if (n[0] > 900) return fail('Mehr als 900 kcal je 100 g sind nicht möglich – bitte prüfen.');
    const vals = n.map((x) => x || 0);
    if (vals[1] + vals[2] + vals[3] + vals[4] > 101) return fail('Eiweiß, Kohlenhydrate, Fett und Ballaststoffe ergeben zusammen mehr als 100 g – bitte prüfen.');
    const gpu = numIn(f.gpu), tl = numIn(f.tl);
    if (f.unit === 'Stk' && !(gpu > 0)) return fail('Bitte das Gewicht pro Stück angeben.');
    // Plausibilität: Energie sollte ungefähr zu den Makronährstoffen passen (4/4/9 kcal je g, Ballaststoffe 2)
    const calc = 4 * vals[1] + 4 * vals[2] + 9 * vals[3] + 2 * vals[4];
    if (!f.warn && (vals[1] || vals[2] || vals[3]) && Math.abs(calc - vals[0]) > Math.max(40, vals[0] * 0.3)) {
      f.warn = `Die Energie (${KA.fmtNum(vals[0], 0)} kcal) passt nicht zu Eiweiß, Kohlenhydraten und Fett (ergäbe etwa ${KA.fmtNum(calc, 0)} kcal). Bitte prüfen – oder trotzdem speichern.`;
      redrawFood(); return;
    }
    const food = { id: f.id || 'x_' + KA.norm(name).replace(/[^a-z0-9]+/g, '_').slice(0, 24) + '_' + Date.now().toString(36), name, unit: f.unit,
      gpu: f.unit === 'Stk' ? gpu : 1, tl: f.unit === 'g' && tl > 0 ? tl : null, n: vals, flags: FOOD_FLAGS.map((x) => x[0]).filter((k) => f.flags.includes(k)), src: f.src || 'eigene Angabe' };
    const at = S.foods.findIndex((x) => x.id === food.id);
    if (at >= 0) S.foods[at] = food; else S.foods.push(food);
    ui.food = null; closeDlg(); update();
    toast(`„${name}“ gespeichert – wird jetzt mitgerechnet.`);
  }

  const viewBook = () => (ui.book === 'detail' && bookRecipe(ui.selId) ? viewDetail() : ui.book === 'add' ? viewAdd() : viewLibrary());

  function openRecipe(id) {
    const r = bookRecipe(id);
    if (!r) return;
    const inL = S.list.find((l) => l.id === id);
    Object.assign(ui, { book: 'detail', selId: id, detailServ: inL ? inL.serv : r.serv });
    S.tab = 'book';
    update(); window.scrollTo(0, 0);
  }

  function saveRecipe(r) {
    const rec = Object.assign({}, r, { id: 'u' + Date.now(), tone: S.my.length % TONES.length, ings: r.ings.map(linkIng) });
    S.my.unshift(rec);
    openRecipe(rec.id);
    toast('Rezept gespeichert');
  }

  // Bild verkleinern, damit es dauerhaft in den lokalen Speicher passt
  function readImage(file, cb) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('Bitte JPG, PNG oder WebP wählen'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 640 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      cb(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Bild konnte nicht gelesen werden'); };
    img.src = url;
  }

  /* ---------- Einkaufsliste des Rezeptbuchs (Schublade) ---------- */
  // Fasst die Zutaten aller Rezepte auf der Liste zusammen; freie Artikel kommen dazu.
  const BASICS = ['salz', 'pfeffer', 'salz, pfeffer', 'salz und pfeffer', 'wasser'].map(KA.norm);
  const isBasic = (name) => BASICS.includes(KA.norm(name));
  function bookAgg() {
    const agg = {};
    S.list.forEach((l) => {
      const r = bookRecipe(l.id);
      if (!r) return;
      const f = l.serv / r.serv;
      r.ings.forEach((i) => {
        if (S.prefs.assumeStaples && (i.id ? ING[i.id].staple : i.qty == null && isBasic(i.name))) return;
        const std = i.id && i.base > 0; // in Stammdaten-Einheit summierbar
        const key = std ? 'i|' + i.id : 'x|' + KA.norm(i.name) + '|' + (i.unit || '');
        if ((l.omitted || []).includes(key)) return;
        const a = agg[key] || (agg[key] = { key, id: std ? i.id : null, name: std ? ING[i.id].name : i.name, unit: std ? ING[i.id].unit : i.unit || '', cat: i.id ? ING[i.id].cat : 'SO', qty: 0, from: [] });
        if (std) a.qty += i.base * f; else if (i.qty != null) a.qty += i.qty * f;
        if (!a.from.includes(r.title)) a.from.push(r.title);
      });
    });
    S.extras.forEach((name) => {
      const key = 'e|' + KA.norm(name);
      agg[key] = { key, id: null, name, unit: '', cat: 'SO', qty: 0, from: ['Manuell hinzugefügt'], extra: true };
    });
    return Object.values(agg);
  }

  /* ---------- Render ---------- */
  const TABS = [['book', 'Rezeptbuch', 'Rezepte'], ['finder', 'Rezepte aus Vorrat', 'Finden'], ['plan', 'Wochenplan', 'Plan'], ['pantry', 'Vorrat', 'Vorrat'], ['shop', 'Einkaufsliste', 'Liste']];
  function chrome() {
    const open = cartOpen().length;
    const book = allBook();
    const count = { book: book.length, pantry: pMode() === 'off' ? '' : pIds().length, shop: open };
    const inLib = S.tab === 'book' && ui.book === 'library';
    TABS[1][1] = pMode() === 'off' ? 'Rezepte finden' : 'Rezepte aus Vorrat';
    $('#side').innerHTML = `<div class="brand"><b>Kochapp</b><span>Rezepte · Vorrat · Wochenplan</span></div>
      <button class="newbtn" data-act="bookadd"><span>+</span>Neues Rezept</button>
      <nav class="snav">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}"><span>${l}</span><i>${count[k] == null ? '' : count[k]}</i></button>`).join('')}</nav>
      <div class="snav"><div class="slabel">Sammlungen</div>${BOOK_CATS.concat(['Eigene']).map((c) =>
        `<button class="${inLib && ui.filter === c ? 'on' : ''}" data-act="bookfilter" data-v="${c}"><span>${c}</span><i>${book.filter((r) => (c === 'Eigene' ? !r.builtin : r.cat === c)).length}</i></button>`).join('')}</div>`;
    $('#mtop').innerHTML = '<b>Kochapp</b><button data-act="bookadd" aria-label="Neues Rezept">+</button>';
    $('#tabbar').innerHTML = TABS.map(([k, , l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}${k === 'shop' ? `<i>${open || ''}</i>` : ''}</button>`).join('');
  }
  function render() {
    syncRecipes();
    const y = window.scrollY;
    // angefangene Eingaben über den Neuaufbau retten
    const keep = ['d-ing', 'd-step', 'extra-in', 'p-quick'].map((id) => [id, $('#' + id) ? $('#' + id).value : '']);
    $('#view').innerHTML = { book: viewBook, finder: viewFinder, plan: viewPlan, pantry: viewPantry, shop: viewShop }[S.tab]();
    chrome();
    keep.forEach(([id, v]) => { if (v && $('#' + id)) $('#' + id).value = v; });
    if ($('#d-ing')) $('#d-prev').innerHTML = previewHTML($('#d-ing').value);
    if ($('#p-quick')) $('#p-prev').innerHTML = quickPreview($('#p-quick').value);
    window.scrollTo(0, y);
    if (ui.focus) { const el = $('#' + ui.focus); if (el) el.focus(); ui.focus = null; }
  }
  const update = () => { save(); render(); };

  /* ---------- Dialog ---------- */
  function openDlg(html) {
    $('#dlg-body').innerHTML = html;
    const d = $('#dlg');
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  }
  const closeDlg = () => { const d = $('#dlg'); if (d.close) d.close(); else d.removeAttribute('open'); };

  function recipeDialog(id, f) {
    const r = REC[id];
    const n = KA.recipeNutr(r).map((x) => x * f);
    return `<h2>${esc(r.name)}</h2><div class="meta">${recipeFacts(r)}</div><div class="tags">${recipeTags(r)}</div>
      <p class="muted">Menge für 1 Person: ${portion(f)}× Portion (${r0(n[0])} kcal, ${r0(n[1])} g Eiweiß, ${r0(n[2])} g KH, ${r0(n[3])} g Fett). Rezept ergibt ${r.s} Portion${r.s > 1 ? 'en' : ''}.</p>
      <h4 class="cat">Zutaten für ${r.s} Portion${r.s > 1 ? 'en' : ''}</h4>${ingTable(r, r.s, null)}
      <h4 class="cat">Zubereitung</h4><ol class="steps">${r.st.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="btnrow"><button class="btn" data-act="closedlg">Schließen</button></div>`;
  }

  function swapDialog(d, slot) {
    const alts = KA.alternatives(S.plan, S.prefs, d, slot).slice(0, 14);
    const cur = REC[S.plan.days[d].find((m) => m.slot === slot).rid];
    return `<h2>${MEALS[slot].label} · ${KA.DAYS[d]} tauschen</h2><p class="muted">Aktuell: <b>${esc(cur.name)}</b>. Sortiert danach, wie gut die Alternative zu deiner Tagesbilanz und dem Wochenplan passt.</p>
      ${alts.length ? `<ul class="alts">${alts.map((a) => {
        const kcal = KA.recipeNutr(a.r)[0] * a.f;
        const q = a.delta < -0.05 ? '<span class="st ok">▲ besser</span>' : a.delta > 0.4 ? '<span class="st miss">▼ schlechter</span>' : '<span class="st part">≈ ähnlich</span>';
        return `<li><button data-act="pickalt" data-d="${d}" data-s="${slot}" data-id="${a.r.id}" data-f="${a.f}"><b>${esc(a.r.name)}</b><span class="muted">⏱ ${a.r.time} Min. · ${dots(a.r.diff)} · ${r0(kcal)} kcal</span>${q}</button></li>`;
      }).join('')}</ul>` : '<p class="muted">Keine weiteren Rezepte für diese Mahlzeit mit deinen Filtern.</p>'}
      <div class="btnrow"><button class="btn ghost" data-act="closedlg">Abbrechen</button></div>`;
  }

  /* ---------- Aktionen ---------- */
  const copyText = async (t) => {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove(); return ok;
    }
  };

  function genPlan() {
    const m = S.prefs.macro;
    if (m.enabled && m.p + m.c + m.f !== 100) { ui.planError = 'Das Makro-Verhältnis muss zusammen 100 % ergeben.'; return; }
    const out = KA.generatePlan(S.prefs, S.plan && S.plan.sig === KA.planSig(S.prefs) ? S.plan : null);
    if (out.error) { ui.planError = out.error; if (!S.plan) S.plan = null; return; }
    ui.planError = '';
    S.plan = out.plan;
  }

  const A = {
    tab: (el) => { S.tab = el.dataset.v; ui.book = 'library'; update(); window.scrollTo(0, 0); },

    /* Rezeptbuch */
    booklib: () => { S.tab = 'book'; ui.book = 'library'; ui.filter = 'Alle'; ui.cuisine = 'Alle'; update(); window.scrollTo(0, 0); },
    bookfilter: (el) => { S.tab = 'book'; ui.book = 'library'; ui.filter = el.dataset.v; ui.cuisine = 'Alle'; update(); },
    bookcuisine: (el) => { ui.cuisine = el.dataset.v; update(); },
    fcat: (el) => { ui.fcat = el.dataset.v; ui.flimit = 24; render(); },
    fmore: () => { ui.flimit += 24; render(); },
    bookadd: () => { S.tab = 'book'; ui.book = 'add'; update(); window.scrollTo(0, 0); },
    openrec: (el) => openRecipe(el.dataset.id),
    addlist: (el) => {
      const r = bookRecipe(el.dataset.id);
      if (!r || S.list.some((l) => l.id === r.id)) return;
      S.list.push({ id: r.id, serv: r.serv });
      update(); toast('Zur Einkaufsliste hinzugefügt');
    },
    addlistd: () => {
      const l = S.list.find((x) => x.id === ui.selId);
      if (l) l.serv = ui.detailServ; else S.list.push({ id: ui.selId, serv: ui.detailServ });
      update(); toast('Zur Einkaufsliste hinzugefügt');
    },
    dserv: (el) => { ui.detailServ = Math.max(1, Math.min(30, ui.detailServ + Number(el.dataset.d))); render(); },
    delrec: () => {
      const r = bookRecipe(ui.selId);
      if (!r || r.builtin || !confirm(`„${r.title}“ wirklich löschen?`)) return;
      S.my = S.my.filter((x) => x.id !== r.id);
      S.list = S.list.filter((l) => l.id !== r.id);
      ui.book = 'library'; update(); toast('Rezept gelöscht');
    },
    addmode: (el) => { ui.addMode = el.dataset.v; render(); },
    dstep: (el) => { ui.draft.serv = Math.max(1, Math.min(30, ui.draft.serv + Number(el.dataset.d))); render(); },
    dcat: (el) => { ui.draft.cat = el.dataset.v; render(); },
    dcuisine: (el) => { ui.draft.cuisine = ui.draft.cuisine === el.dataset.v ? '' : el.dataset.v; render(); },
    ddiff: (el) => { ui.draft.diff = Number(el.dataset.v); render(); },
    deling: (el) => { ui.draft.ings.splice(Number(el.dataset.i), 1); render(); },
    delstep: (el) => { ui.draft.steps.splice(Number(el.dataset.i), 1); render(); },
    savedraft: () => {
      const d = ui.draft;
      // noch nicht mit Enter bestätigte Eingaben mitnehmen
      const ing = $('#d-ing'), st = $('#d-step');
      if (ing && ing.value.trim()) d.ings.push(parseLine(ing.value));
      if (st && st.value.trim()) d.steps.push(st.value.trim());
      if (ing) ing.value = '';
      if (st) st.value = '';
      if (!d.title.trim()) { ui.focus = 'd-title'; render(); toast('Bitte einen Titel eingeben.'); return; }
      ui.draft = emptyDraft();
      saveRecipe({ title: d.title.trim(), cat: d.cat, cuisine: d.cuisine, diff: d.diff, time: Number(d.time) || 30, serv: d.serv, source: 'Eigenes', ings: d.ings, steps: d.steps, image: d.image });
    },
    scanstart: () => {
      clearTimeout(demoTimer);
      ui.scan = JSON.parse(JSON.stringify(SCAN)); ui.scanPhase = 'busy'; render();
      demoTimer = setTimeout(() => { ui.scanPhase = 'done'; render(); }, 2000);
    },
    scanreset: () => { clearTimeout(demoTimer); ui.scanPhase = 'idle'; render(); },
    scansave: () => {
      const c = ui.scan;
      ui.scanPhase = 'idle';
      saveRecipe({ title: c.title.trim() || SCAN.title, cat: c.cat, time: c.time, serv: c.serv, source: 'Foto-Scan', ings: c.ings.filter((i) => i.text.trim()).map((i) => parseLine(i.text)), steps: c.steps });
    },
    linkfetch: async () => {
      if (ui.link.phase === 'busy') return;
      const l = ui.link;
      l.url = ($('#l-url') ? $('#l-url').value : l.url).trim();
      l.error = ''; l.recipe = null;
      try {
        const url = new URL(l.url);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch { l.error = 'Bitte einen vollständigen http://- oder https://-Rezeptlink eingeben.'; render(); return; }
      const importURL = location.protocol === 'file:'
        ? 'https://kochapp-rezeptbuch.readyberry.chatgpt.site/api/import-recipe'
        : '/api/import-recipe';
      l.phase = 'busy'; render();
      try {
        let data;
        if (window.KA_DESKTOP) {
          // Windows-App: Die App-Hülle ruft die Seite ab (/api/fetch-page); ausgewertet wird sie mit demselben
          // Code wie auf dem Server (import-recipe.mjs).
          const response = await fetch('/api/fetch-page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: l.url }) });
          if (!response.ok) { let err = {}; try { err = await response.json(); } catch (e) { /* keine JSON-Antwort */ } throw new Error(err.error || 'Das Rezept konnte nicht importiert werden.'); }
          const html = await response.text();
          const importer = await import('./import-recipe.mjs');
          data = { recipe: importer.parseRecipe(html, response.headers.get('X-Final-Url') || l.url) };
        } else {
          const response = await fetch(importURL, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: l.url }) });
          data = await response.json();
          if (!response.ok || !data.recipe) throw new Error(data.error || 'Das Rezept konnte nicht importiert werden.');
        }
        if (ui.link !== l) return;
        l.recipe = data.recipe; l.phase = 'done';
      } catch (error) {
        if (ui.link !== l) return;
        l.phase = 'idle'; l.error = error.message || 'Die Website konnte nicht erreicht werden.';
      }
      if (ui.book === 'add' && ui.addMode === 'link') render();
    },
    linkreset: () => { ui.link = { url: '', phase: 'idle' }; render(); },
    linksave: () => {
      const r = ui.link.recipe;
      if (!r) return;
      if (!r.title.trim() || !r.ingredients.some(x => x.trim()) || !r.steps.some(x => x.trim())) { toast('Bitte Titel, Zutaten und Zubereitung ausfüllen.'); return; }
      const recipe = { ...r, title: r.title.trim(), serv: Math.max(1, Math.min(1000, Math.round(Number(r.serv) || 1))), time: Math.max(0, Math.min(10080, Math.round(Number(r.time) || 0))), ings: r.ingredients.map(x => x.trim()).filter(Boolean).map(parseLine), steps: r.steps.map(x => x.trim()).filter(Boolean) };
      delete recipe.ingredients;
      ui.link = { url: '', phase: 'idle' }; saveRecipe(recipe);
    },

    /* Einkaufsliste */
    blockdel: (el) => { S.blocks[el.dataset.v] = null; update(); },
    listserv: (el) => { const l = S.list.find((x) => x.id === el.dataset.id); l.serv = Math.max(1, Math.min(30, l.serv + Number(el.dataset.d))); update(); },
    listdel: (el) => { S.list = S.list.filter((x) => x.id !== el.dataset.id); update(); },
    listchk: (el) => { const k = el.dataset.k; if (S.done[k]) delete S.done[k]; else S.done[k] = true; update(); },
    addextra: () => {
      const v = $('#extra-in').value.trim();
      if (v && !S.extras.some((x) => KA.norm(x) === KA.norm(v))) S.extras.push(v);
      $('#extra-in').value = '';
      ui.focus = 'extra-in'; update();
    },
    extradel: (el) => { S.extras = S.extras.filter((x) => x !== el.dataset.n); delete S.done['e|' + KA.norm(el.dataset.n)]; update(); },
    listclean: () => {
      const completed = new Set(cartItems().filter((i) => !i.checked).map((i) => i.key));
      if (!completed.size) return;
      // Zutaten nur aus diesen Listeneinträgen entfernen; Rezepte bleiben unverändert.
      S.list.forEach((l) => { l.omitted = [...new Set([...(l.omitted || []), ...completed])]; });
      Object.values(S.blocks).forEach((b) => {
        if (b) b.items = b.items.filter((i) => !completed.has(i.id && ING[i.id]
          ? 'i|' + i.id : 'x|' + KA.norm(i.name) + '|' + (i.unit || '')));
      });
      S.extras = S.extras.filter((name) => !completed.has('e|' + KA.norm(name)));
      completed.forEach((key) => { delete S.done[key]; });
      update();
      toast(`${completed.size} eingekaufte Artikel entfernt`);
    },
    listreset: () => { S.done = {}; update(); },

    setTime: (el) => { S.prefs.maxTime = Number(el.dataset.v); update(); },
    setDiff: (el) => { S.prefs.maxDiff = Number(el.dataset.v); update(); },
    adddis: () => {
      const v = $('#dis-in').value.trim();
      if (v) v.split(/[,;]/).map((x) => x.trim()).filter(Boolean).forEach((x) => { if (!S.prefs.dislikes.includes(x)) S.prefs.dislikes.push(x); });
      ui.focus = 'dis-in'; update();
    },
    deldis: (el) => { S.prefs.dislikes.splice(Number(el.dataset.i), 1); update(); },
    reset: () => { if (confirm('Wirklich alle gespeicherten Daten löschen?')) { S = DEF(); update(); toast('Zurückgesetzt'); } },
    pmode: (el) => {
      const prev = pMode();
      S.pantryMode = el.dataset.v;
      if (prev !== S.pantryMode) toast({ off: 'Ohne Vorrat – alle Zutaten werden eingeplant', simple: 'Vorrat: nur abhaken', exact: 'Vorrat: mit Mengen' }[S.pantryMode]);
      update();
    },
    pquick: () => {
      const inp = $('#p-quick');
      const parts = KA.parsePantry(inp.value);
      const ok = parts.filter((x) => x.ing), bad = parts.filter((x) => !x.ing);
      if (!parts.length) { ui.focus = 'p-quick'; toast('Tippe z. B. „3 Bananen“ ein.'); render(); return; }
      ok.forEach(({ ing, amount }) => {
        const cur = S.pantry[ing.id];
        if (amount == null) { if (!(ing.id in S.pantry)) S.pantry[ing.id] = null; }
        else S.pantry[ing.id] = (cur == null ? 0 : cur) + amount;
      });
      inp.value = bad.map((x) => x.text).join(', ');
      ui.focus = 'p-quick'; update();
      if (bad.length) toast(`Nicht gefunden: ${bad.map((x) => x.text).join(', ')} – bitte anders schreiben oder antippen.`);
      else toast(ok.length === 1 ? `${ok[0].ing.name} hinzugefügt` : `${ok.length} Lebensmittel hinzugefügt`);
    },
    pstep: (el) => {
      const id = el.dataset.id, d = Number(el.dataset.d), v = S.pantry[id];
      if (v == null) { if (d > 0) S.pantry[id] = pDefault(id); update(); return; }
      const next = Math.round((v + d * pStep(id, d < 0 ? v - 1 : v)) * 100) / 100;
      if (next <= 0) { delete S.pantry[id]; toast(`${ING[id].name} aufgebraucht`); } else S.pantry[id] = next;
      update();
    },
    delp: (el) => { delete S.pantry[el.dataset.id]; update(); },
    demop: () => { S.pantry = Object.assign({}, KA.DEMO_PANTRY); S.sel = []; update(); },
    clearp: () => { if (confirm('Vorrat wirklich leeren?')) { S.pantry = {}; S.sel = []; update(); } },
    togglesel: (el) => {
      const id = el.dataset.id;
      S.sel = S.sel.includes(id) ? S.sel.filter((x) => x !== id) : S.sel.concat(id);
      update();
    },
    takecombo: () => { S.sel = KA.bestCombo(pantryEff(), S.prefs, S.comboN); update(); },
    clearsel: () => { S.sel = []; update(); },
    cook: (el) => {
      const next = KA.cookRecipe(el.dataset.id, pantryEff(), S.prefs);
      pIds().forEach((id) => {
        if (S.pantry[id] == null) return; // „Menge offen“ bleibt vorhanden
        if (next[id] == null) delete S.pantry[id]; else S.pantry[id] = Math.round(next[id] * 100) / 100;
      });
      S.sel = S.sel.filter((x) => x !== el.dataset.id);
      update(); toast('Vorrat aktualisiert');
    },
    // Rezept-Auswahl bzw. Wochenplan auf die Einkaufsliste übernehmen (ersetzt den vorher übernommenen Stand)
    tofinderlist: () => {
      const sel = S.sel.filter((id) => REC[id]);
      if (!sel.length) { toast('Keine Rezepte ausgewählt.'); return; }
      S.blocks.finder = { items: finderList(sel, pantryEff()), names: sel.map((id) => REC[id].name), created: Date.now() };
      ui.orderResult = null; S.tab = 'shop'; update(); window.scrollTo(0, 0);
    },
    setMacro: (el) => { const v = MACRO_PRESETS[el.dataset.v]; Object.assign(S.prefs.macro, { enabled: true, p: v[1], c: v[2], f: v[3] }); update(); },
    genplan: () => { genPlan(); update(); },
    toplanlist: () => {
      if (!S.plan) { toast('Es gibt noch keinen Wochenplan.'); return; }
      S.blocks.plan = { items: planList(), created: Date.now() };
      ui.orderResult = null; S.tab = 'shop'; update(); window.scrollTo(0, 0);
    },
    nutday: (el) => { ui.nutDay = Number(el.dataset.v); render(); },
    reroll: (el) => {
      const d = Number(el.dataset.d);
      if (!KA.reroll(S.plan, S.prefs, d, el.dataset.s)) toast('Keine Alternative mit diesen Filtern.');
      update();
    },
    swap: (el) => openDlg(swapDialog(Number(el.dataset.d), el.dataset.s)),
    pickalt: (el) => {
      KA.applyMeal(S.plan, S.prefs, Number(el.dataset.d), el.dataset.s, el.dataset.id, Number(el.dataset.f));
      closeDlg(); update();
    },
    lock: (el) => {
      const m = S.plan.days[Number(el.dataset.d)].find((x) => x.slot === el.dataset.s);
      m.lock = !m.lock; update();
    },
    view: (el) => openDlg(recipeDialog(el.dataset.id, Number(el.dataset.f) || 1)),
    closedlg: closeDlg,

    /* Eigene Lebensmittel */
    fdnew: (el) => openFood(el.dataset.n || ''),
    fdedit: (el) => openFood('', S.foods.find((x) => x.id === el.dataset.id)),
    fdmode: (el) => { ui.food.mode = el.dataset.v; redrawFood(); if (ui.food.mode === 'web') { const q = $('#fd-q'); if (q) q.focus(); } },
    fdsearch: () => searchFood(),
    fdpick: (el) => {
      const f = ui.food, p = f.results[Number(el.dataset.i)];
      f.n = p.n.map((x, i) => (x != null && (x || i < 5) ? fmtIn(x) : ''));
      if (!f.name.trim()) f.name = p.name;
      f.src = `Open Food Facts: ${p.name}${p.brand ? ' (' + p.brand + ')' : ''}${p.code ? ', Nr. ' + p.code : ''}`;
      f.mode = 'manual'; f.warn = '';
      if (p.n.slice(5).some((x) => x)) ui.open.add('fdmore');
      redrawFood(); toast('Werte übernommen – bitte prüfen und speichern.');
    },
    fdflag: (el) => { const f = ui.food, k = el.dataset.v; f.flags = f.flags.includes(k) ? f.flags.filter((x) => x !== k) : f.flags.concat(k); redrawFood(); },
    fdsave: () => saveFood(),
    fddel: () => {
      const f = ui.food;
      if (!confirm(`„${f.name}“ löschen? Rezepte mit diesem Lebensmittel rechnen es dann nicht mehr mit.`)) return;
      S.foods = S.foods.filter((x) => x.id !== f.id);
      delete S.pantry[f.id];
      ui.food = null; closeDlg(); update(); toast('Lebensmittel gelöscht');
    },
    copy: async () => { toast((await copyText(KA.listToText(cartOpen(), null))) ? 'Liste kopiert' : 'Kopieren nicht möglich'); },
    csv: () => {
      const rows = [['Kategorie', 'Artikel', 'Menge', 'Einheit', 'Preis (EUR)']].concat(
        cartOpen().map((i) => [CATS[i.cat], i.name, i.amount == null ? '' : String(i.amount).replace('.', ','), i.unit, i.price.toFixed(2).replace('.', ',')]));
      const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'einkaufsliste.csv'; document.body.appendChild(a); a.click(); a.remove();
    },
    print: () => window.print(),
    preview: () => { ui.preview = !ui.preview; render(); },
    order: () => {
      const o = S.order;
      const prov = KA.Providers[o.provider];
      const items = cartOpen();
      if (!items.length) { toast('Auf der Einkaufsliste ist nichts mehr offen.'); return; }
      if (ui.ordering) return;
      if (prov.needsZip) { // REWE: erst die Postleitzahl abfragen
        openDlg(zipDialog(items.length));
        setTimeout(() => { const z = $('#zip-in'); if (z) { z.focus(); z.select(); } }, 50);
        return;
      }
      if (o.provider !== 'mock' && !confirm(`${items.length} Artikel jetzt über „${prov.label}“ bestellen?`)) return;
      runOrder();
    },
    rewego: () => {
      const zip = $('#zip-in').value.trim(), service = $('#zip-svc').value;
      if (!/^\d{5}$/.test(zip)) { $('#zip-err').textContent = 'Bitte eine fünfstellige Postleitzahl eingeben.'; $('#zip-in').focus(); return; }
      Object.assign((S.order.cfg.rewe = S.order.cfg.rewe || {}), { zip, service });
      save(); closeDlg();
      runOrder({ zip, service });
    },
  };

  function zipDialog(count) {
    const cfg = S.order.cfg.rewe || {};
    return `<h2>Bei REWE in den Warenkorb</h2>
      <p>Die Kochapp legt ${count} Artikel in deinen Warenkorb auf rewe.de und öffnet ihn danach im REWE-Fenster. <b>Es wird nichts bestellt</b> – die Bestellung schließt du dort selbst ab.</p>
      <div class="grid2">
        <label>Deine Postleitzahl<input id="zip-in" inputmode="numeric" maxlength="5" value="${esc(cfg.zip || S.order.customer.zip || '')}" placeholder="z. B. 10115" autocomplete="postal-code"></label>
        <label>Service<select id="zip-svc"><option value="DELIVERY" ${cfg.service !== 'PICKUP' ? 'selected' : ''}>Lieferservice</option><option value="PICKUP" ${cfg.service === 'PICKUP' ? 'selected' : ''}>Abholservice im Markt</option></select></label>
      </div>
      <p class="zip-err" id="zip-err" role="alert"></p>
      <p class="muted sm">Die Postleitzahl geht an rewe.de, um deinen Markt zu wählen. Für jeden Artikel wird das erste lieferbare Suchergebnis genommen – bitte den Warenkorb vor dem Bestellen prüfen. Liegt ein Artikel schon im REWE-Warenkorb, wird seine Menge ersetzt, nicht addiert.</p>
      <div class="btnrow"><button class="btn ghost" data-act="closedlg">Abbrechen</button><button class="btn" data-act="rewego">Warenkorb füllen</button></div>`;
  }

  // Übergibt die ausgewählten Artikel an den gewählten Anbieter; ctx nur bei REWE ({ zip, service })
  async function runOrder(ctx) {
    const o = S.order, prov = KA.Providers[o.provider];
    const items = cartOpen();
    ui.ordering = true; ui.orderResult = null; ui.orderProgress = ''; render();
    if (ctx) ctx.onProgress = (t) => { ui.orderProgress = t; const el = $('#order-progress'); if (el) el.textContent = t; };
    try { ui.orderResult = await prov.submit(items, o.cfg[o.provider] || {}, o.customer, ctx); } catch (e) { ui.orderResult = { ok: false, message: e.message }; }
    ui.ordering = false; ui.orderProgress = ''; save(); render();
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.disabled) return;
    const f = A[el.dataset.act];
    if (f) f(el, e);
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'l-cat' && ui.link.recipe) { ui.link.recipe.cat = t.value; return; }
    if (t.id === 'd-img') { if (t.files[0]) readImage(t.files[0], (url) => { ui.draft.image = url; render(); }); return; }
    if (t.dataset.fd || t.dataset.fn) { if (t.dataset.fd === 'unit' && ui.food) { ui.food.unit = t.value; redrawFood(); } return; } // Lebensmittel-Dialog
    if (t.dataset.act && t.tagName === 'INPUT') { A[t.dataset.act](t, e); return; }
    if (t.dataset.cuisine) {
      const s = new Set(S.prefs.cuisines || []);
      t.checked ? s.add(t.dataset.cuisine) : s.delete(t.dataset.cuisine);
      S.prefs.cuisines = KA.KUECHEN.filter((k) => s.has(k));
      update(); return;
    }
    if (t.dataset.diet) {
      const s = new Set(S.prefs.diets);
      t.checked ? s.add(t.dataset.diet) : s.delete(t.dataset.diet);
      S.prefs.diets = Object.keys(DIETS).filter((k) => s.has(k));
      update(); return;
    }
    if (t.dataset.pchip) {
      const id = t.dataset.pchip;
      if (t.checked) { if (!(id in S.pantry)) S.pantry[id] = null; } else delete S.pantry[id];
      update(); return;
    }
    if (t.dataset.meal) { S.prefs.meals[t.dataset.meal] = t.checked ? 1 : 0; update(); return; }
    if (t.classList.contains('pamt')) {
      const raw = String(t.value).trim().replace(',', '.');
      const v = parseFloat(raw);
      if (raw === '') S.pantry[t.dataset.id] = null; // Menge offen, bleibt aber vorhanden
      else if (v > 0) S.pantry[t.dataset.id] = v;
      else delete S.pantry[t.dataset.id];
      update(); return;
    }
    if (t.dataset.bind) {
      let v;
      if (t.type === 'checkbox') v = t.checked;
      else if (t.dataset.num) { v = Number(String(t.value).replace(',', '.')); if (!isFinite(v)) return; }
      else v = t.value;
      if (t.dataset.bind === 'prefs.persons') v = Math.max(1, Math.min(12, Math.round(v)));
      if (t.dataset.bind === 'comboN') v = Math.max(1, Math.min(6, Math.round(v)));
      setPath(S, t.dataset.bind, v);
      if (t.dataset.bind === 'order.provider') { ui.preview = false; ui.orderResult = null; }
      update();
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    // Rezeptbuch: Eingaben direkt in den Zustand schreiben, ohne die Ansicht neu aufzubauen
    if (ui.food && t.dataset.fd) { ui.food[t.dataset.fd] = t.value; return; }
    if (ui.food && t.dataset.fn) { ui.food.n[Number(t.dataset.fn)] = t.value; ui.food.warn = ''; return; }
    if (t.id === 'bk-q') { ui.query = t.value; $('#bk-cards').innerHTML = bookCards(); return; }
    if (t.id === 'd-title') { ui.draft.title = t.value; return; }
    if (t.id === 'd-time') { t.value = t.value.replace(/\D/g, ''); ui.draft.time = t.value; return; }
    if (t.id === 'd-ing') { $('#d-prev').innerHTML = previewHTML(t.value); return; }
    if (t.id === 's-title') { ui.scan.title = t.value; return; }
    if (t.dataset.si) { ui.scan.ings[Number(t.dataset.si)].text = t.value; return; }
    if (t.id === 'l-url') { ui.link.url = t.value; return; }
    if (ui.link.recipe && t.id.startsWith('l-')) {
      const fields = { 'l-title': 'title', 'l-serv': 'serv', 'l-time': 'time', 'l-ingredients': 'ingredients', 'l-steps': 'steps' };
      const key = fields[t.id];
      if (key) ui.link.recipe[key] = ['ingredients', 'steps'].includes(key) ? t.value.split('\n') : t.value;
      return;
    }

    if (t.id === 'p-quick') { $('#p-prev').innerHTML = quickPreview(t.value); }
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.classList.contains('bcard')) { e.preventDefault(); openRecipe(t.dataset.id); return; }
    if (e.key !== 'Enter') return;
    if (t.id === 'd-ing' && t.value.trim()) { ui.draft.ings.push(parseLine(t.value)); t.value = ''; ui.focus = 'd-ing'; render(); return; }
    if (t.id === 'd-step' && t.value.trim()) { ui.draft.steps.push(t.value.trim()); t.value = ''; ui.focus = 'd-step'; render(); return; }
    if (t.id === 'extra-in') { A.addextra(); return; }
    if (t.id === 'zip-in') { A.rewego(); return; }
    if (t.id === 'fd-q') { searchFood(); return; }
    if (t.id === 'l-url') { A.linkfetch(); return; }
    if (t.id === 'p-quick') { A.pquick(); return; }
    if (t.classList.contains('pamt')) { t.blur(); return; }
    if (e.target.id === 'dis-in') A.adddis();
  });
  document.addEventListener('toggle', (e) => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    e.target.open ? ui.open.add(k) : ui.open.delete(k);
  }, true);
  $('#dlg').addEventListener('click', (e) => { if (e.target.id === 'dlg') closeDlg(); });

  if (!['book', 'finder', 'plan', 'pantry', 'shop'].includes(S.tab)) S.tab = 'book';
  // ältere Versionen hatten eine zweite, getrennte Einkaufsliste (S.shop) – in die eine Liste übernehmen
  if (!S.blocks || typeof S.blocks !== 'object') S.blocks = { finder: null, plan: null };
  let migratedWebsiteLists = false;
  for (const [oldKey, blockKey] of [['planList', 'plan'], ['finderList', 'finder']]) {
    if (Array.isArray(S[oldKey]) && S[oldKey].length && !S.blocks[blockKey]) {
      S.blocks[blockKey] = { items: S[oldKey], created: Date.now() };
      migratedWebsiteLists = true;
    }
    if (oldKey in S) { delete S[oldKey]; migratedWebsiteLists = true; }
  }
  if (migratedWebsiteLists) save();
  if (S.shop && Array.isArray(S.shop.items)) {
    const items = S.shop.items.filter((i) => i && i.checked !== false);
    if (S.shop.source === 'Wochenplan') S.blocks.plan = S.blocks.plan || { items, created: S.shop.created || Date.now() };
    else if (S.shop.source !== 'Rezeptbuch') S.blocks.finder = S.blocks.finder || { items, created: S.shop.created || Date.now() };
  }
  delete S.shop;
  S.list = S.list.filter((l) => bookRecipe(l.id));
  // einmalig: REWE als Anbieter voreinstellen, auch wenn aus einer älteren Version noch der Demo-Shop gespeichert ist
  if (!S.order.reweDefault) { S.order.provider = 'rewe'; S.order.reweDefault = true; }
  if (!KA.Providers[S.order.provider]) S.order.provider = 'rewe';
  render();
})();
