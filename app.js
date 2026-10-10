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
      diets: [], dislikes: [], maxTime: 60, maxDiff: 3, persons: 2, assumeStaples: true, onlyMine: false,
      meals: { f: 1, m: 1, a: 1, s: 0 },
      macro: { enabled: false, p: 20, c: 50, f: 30 },
      body: { enabled: false, sex: 'm', age: 30, height: 175, weight: 70, activity: 1.6, goal: 'keep' },
    },
    pantry: {}, sel: [], comboN: 3, plan: null, shop: null, subPantry: true,
    order: { provider: 'mock', cfg: { rest: { method: 'POST', authHeader: 'Authorization' }, mailto: {}, mock: {} }, customer: { name: '', street: '', zip: '', city: '' } },
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
  const emptyDraft = () => ({ title: '', serv: 4, time: '', cat: 'Hauptgericht', diff: 2, ings: [], steps: [], image: '' });
  const ui = {
    open: new Set(), nutDay: -1, preview: false, orderResult: null, ordering: false, planError: '', focus: null,
    book: 'library', selId: null, detailServ: 2, filter: 'Alle', query: '', addMode: 'manual', draft: emptyDraft(),
    scan: null, scanPhase: 'idle', link: { url: '', phase: 'idle' }, listOpen: false,
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
  function filterBar() {
    const p = S.prefs;
    return `
    <div class="fgroup"><div class="flabel">Ernährung <small>(frei kombinierbar)</small></div>
      <div class="chips">${Object.entries(DIETS).map(([k, d]) =>
        `<label class="chip"><input type="checkbox" data-diet="${k}" ${p.diets.includes(k) ? 'checked' : ''}><span>${esc(d.label)}</span></label>`).join('')}</div></div>
    <div class="frow">
      <div class="fgroup"><div class="flabel">Max. Zubereitungszeit</div>
        <div class="seg">${TIMES.map(([v, l]) => `<button class="${p.maxTime === v ? 'on' : ''}" data-act="setTime" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="fgroup"><div class="flabel">Max. Schwierigkeit</div>
        <div class="seg">${[1, 2, 3].map((v) => `<button class="${p.maxDiff === v ? 'on' : ''}" data-act="setDiff" data-v="${v}">${dots(v)} ${DIFF[v]}</button>`).join('')}</div></div>
    </div>`;
  }
  const filterDetails = (key) => {
    const n = S.prefs.diets.length;
    const t = S.prefs.maxTime ? `≤ ${S.prefs.maxTime} Min.` : 'Zeit egal';
    return `<details class="card filt" data-key="${key}" ${ui.open.has(key) ? 'open' : ''}>
      <summary><b>Präferenzen</b> <span class="muted">${n ? n + ' Ernährungsform' + (n > 1 ? 'en' : '') + ' · ' : ''}${t} · bis ${DIFF[S.prefs.maxDiff].toLowerCase()}</span></summary>
      ${filterBar()}<p class="muted sm">Weitere Einstellungen (Ausschlüsse, Personen, Körperdaten) findest du im Tab „Profil“.</p></details>`;
  };

  const tag = (txt, cls) => `<span class="tag ${cls || ''}">${esc(txt)}</span>`;
  function recipeTags(r) {
    const f = KA.recipeFlags(r);
    const t = r.user ? ['eigenes'] : [];
    // Bei Zutaten ohne Stammdaten lässt sich keine Ernährungsform zusichern
    if (f.has('unbekannt')) return t.concat('Nährwerte unvollständig').map((x) => tag(x)).join('');
    if (!f.has('fleisch') && !f.has('fisch') && !f.has('schalentier')) t.push(!f.has('milch') && !f.has('ei') && !f.has('honig') ? 'vegan' : 'vegetarisch');
    else if (!f.has('fleisch')) t.push('pescetarisch');
    if (!f.has('gluten')) t.push('glutenfrei');
    if (!f.has('milch')) t.push('laktosefrei');
    const n = KA.recipeNutr(r);
    if ((n[1] * 4) / n[0] >= 0.22) t.push('high protein');
    return t.map((x) => tag(x)).join('');
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

  /* ---------- Tab: Vorrat & Rezepte ---------- */
  function pantryCard() {
    const ids = Object.keys(S.pantry).sort((a, b) => ING[a].name.localeCompare(ING[b].name, 'de'));
    const rows = ids.map((id) => {
      const i = ING[id];
      return `<tr><td>${esc(i.name)}</td>
        <td><input class="pamt" type="number" min="0" step="any" value="${Math.round(S.pantry[id] * 100) / 100}" data-id="${id}"> <span class="muted">${i.unit}</span></td>
        <td><button class="x" data-act="delp" data-id="${id}" title="Entfernen">✕</button></td></tr>`;
    }).join('');
    const opts = Object.values(ING).sort((a, b) => a.name.localeCompare(b.name, 'de')).map((i) => `<option value="${esc(i.name)}"></option>`).join('');
    return `<section class="card"><h2>Mein Vorrat</h2>
      <div class="addrow">
        <input id="p-name" list="ing-list" placeholder="Lebensmittel (z. B. Reis, Eier …)" autocomplete="off">
        <input id="p-amt" type="number" min="0" step="any" placeholder="Menge">
        <select id="p-unit"><option>g</option><option>kg</option></select>
        <button class="btn" data-act="addp">Hinzufügen</button>
      </div>
      <datalist id="ing-list">${opts}</datalist>
      ${ids.length ? `<table class="ptable"><tbody>${rows}</tbody></table>` : '<p class="muted">Noch nichts eingetragen – füge Lebensmittel mit Menge hinzu oder lade einen Beispiel-Vorrat.</p>'}
      <div class="btnrow"><button class="btn ghost" data-act="demop">Beispiel-Vorrat laden</button>${ids.length ? '<button class="btn ghost" data-act="clearp">Leeren</button>' : ''}</div>
    </section>`;
  }

  function recipeCard(e, selected) {
    const r = e.r;
    const key = 'rc-' + r.id;
    return `<article class="rc ${selected ? 'sel' : ''}">
      <div class="rc-top"><h3>${esc(r.name)}</h3>
        <label class="pick" title="Für die Einkaufsliste auswählen"><input type="checkbox" data-act="togglesel" data-id="${r.id}" ${selected ? 'checked' : ''}><span>Auswählen</span></label></div>
      <div class="meta">${recipeFacts(r)}</div>
      <div class="tags">${recipeTags(r)}</div>
      <div class="meters">
        <div><div class="mlabel">Zutaten vorhanden <b>${r0(e.cover * 100)} %</b></div><div class="bar"><i style="width:${r0(e.cover * 100)}%"></i></div></div>
        <div><div class="mlabel">Verbraucht <b>${e.touched} von ${e.pantryCount}</b> Vorratsartikeln</div><div class="bar alt"><i style="width:${r0((e.touched / Math.max(1, e.pantryCount)) * 100)}%"></i></div></div>
      </div>
      <details data-key="${key}" ${ui.open.has(key) ? 'open' : ''}><summary>Zutaten & Zubereitung (${e.servings} Portion${e.servings > 1 ? 'en' : ''})</summary>
        ${ingTable(r, e.servings, e)}<ol class="steps">${r.st.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <button class="btn ghost sm" data-act="cook" data-id="${r.id}">✔ Gekocht – Vorrat abziehen</button></details>
    </article>`;
  }

  function viewFinder() {
    const p = S.prefs;
    const hasPantry = Object.keys(S.pantry).length > 0;
    let out = '';
    if (hasPantry) {
      const results = KA.findRecipes(S.pantry, p);
      const combo = KA.bestCombo(S.pantry, p, S.comboN);
      const sel = S.sel.filter((id) => REC[id]);
      if (!results.length) {
        out = '<section class="card"><h2>Rezepte</h2><p class="muted">Mit deinen Filtern und deinem Vorrat passt aktuell kein Rezept. Lockere die Präferenzen oder füge Lebensmittel hinzu.</p></section>';
      } else {
        const usage = KA.pantryUsage(combo, S.pantry, p);
        const same = combo.length === sel.length && combo.every((x) => sel.includes(x));
        out += `<section class="card combo"><h2>Beste Kombination <span class="opt">verbraucht möglichst viel vom Vorrat</span></h2>
          <div class="frow"><label>Anzahl Gerichte <input class="narrow" type="number" min="1" max="6" value="${S.comboN}" data-bind="comboN" data-num="1"></label>
          <span class="muted">für ${p.persons} Person${p.persons > 1 ? 'en' : ''}</span></div>
          <ol class="combolist">${combo.map((id) => `<li><b>${esc(REC[id].name)}</b> <span class="muted">⏱ ${REC[id].time} Min. · ${dots(REC[id].diff)}</span></li>`).join('')}</ol>
          <p>Damit werden <b>${usage.touched} von ${usage.count}</b> Vorratsartikeln verwendet (ca. ${r0(usage.massFrac * 100)} % der Mengen).</p>
          <button class="btn" data-act="takecombo" ${same ? 'disabled' : ''}>${same ? '✔ Übernommen' : 'Kombination übernehmen'}</button></section>`;

        const list = sel.length ? finderList(sel) : [];
        out += `<section class="card"><h2>Einkaufsliste für die Reste</h2>${
          sel.length
            ? `<p class="muted">Für ${sel.length} ausgewählte${sel.length > 1 ? '' : 's'} Gericht${sel.length > 1 ? 'e' : ''}: ${sel.map((id) => esc(REC[id].name)).join(' · ')}</p>${listHTML(list)}
               <div class="total">Geschätzt: <b>${KA.fmtEUR(listTotal(list))}</b></div>
               <div class="btnrow"><button class="btn" data-act="tofinderlist">Zur Einkaufsliste & Bestellung →</button><button class="btn ghost" data-act="clearsel">Auswahl leeren</button></div>`
            : '<p class="muted">Wähle unten Rezepte aus (oder übernimm die beste Kombination), dann erscheint hier, was zusätzlich besorgt werden muss.</p>'}</section>`;

        out += `<h2 class="sec">Alle passenden Rezepte <span class="opt">${results.length}</span></h2><div class="rgrid">${results.slice(0, 24).map((e) => recipeCard(e, sel.includes(e.r.id))).join('')}</div>`;
      }
    } else {
      out = '<section class="card"><h2>Rezepte</h2><p class="muted">Trage zuerst deinen Vorrat ein – die App schlägt dann Rezepte vor, die möglichst viel davon verwenden, und erstellt eine Einkaufsliste für den Rest.</p><button class="btn" data-act="tab" data-v="shop">Zum Vorrat →</button></section>';
    }
    return pageHead('Rezepte aus Vorrat', 'Verwerte, was du da hast – der Rest kommt auf die Einkaufsliste.') + prefsCard() + out;
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
        <label class="switch"><input type="checkbox" data-bind="subPantry" ${S.subPantry ? 'checked' : ''}><span>Vorhandene Lebensmittel aus „Mein Vorrat“ abziehen (${Object.keys(S.pantry).length} Artikel)</span></label>
        <p class="muted sm">Mengen für ${p.persons} Person${p.persons > 1 ? 'en' : ''} (siehe Profil).</p>
        <button class="btn" data-act="toplanlist">Einkaufsliste erstellen →</button></section>`;
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
    const items = S.shop.items;
    const prev = ui.preview ? `<pre class="json">${esc(JSON.stringify(prov.preview(items, cfg, c), null, 2))}</pre>` : '';
    const res = ui.orderResult ? `<div class="card ${ui.orderResult.ok ? 'okbox' : 'err'}">${esc(ui.orderResult.message)}</div>` : '';
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

  function viewShop() {
    const hasPlan = !!S.plan;
    const hasSel = S.sel.length > 0 && Object.keys(S.pantry).length > 0;
    const sh = S.shop;
    let out = pageHead('Vorrat & Einkauf', 'Vorrat pflegen, Einkaufsliste drucken oder bestellen.') + pantryCard() + `<section class="card"><h2>Einkaufsliste erzeugen aus …</h2><div class="btnrow">
      <button class="btn ghost" data-act="tofinderlist" ${hasSel ? '' : 'disabled'}>Rezept-Auswahl (Reste)</button>
      <button class="btn ghost" data-act="toplanlist" ${hasPlan ? '' : 'disabled'}>Wochenplan</button>
      <button class="btn ghost" data-act="listtoshop" ${S.list.length || S.extras.length ? '' : 'disabled'}>Rezeptbuch-Liste</button></div></section>`;
    if (!sh) return out + '<section class="card"><p class="muted">Noch keine Einkaufsliste. Erstelle sie im Tab „Rezepte aus Vorrat“ oder „Wochenplan“.</p></section>' + resetCard();
    const total = listTotal(sh.items);
    out += `<section class="card printable"><div class="lh"><h2>Einkaufsliste <span class="opt">${esc(sh.source)}</span></h2><span class="muted sm">${new Date(sh.created).toLocaleString('de-DE')}</span></div>
      <div class="plist">${listHTML(sh.items, { editable: true })}</div>
      <div class="total">Geschätzt (${sh.items.filter((i) => i.checked !== false).length} Artikel): <b>${KA.fmtEUR(total)}</b> <span class="muted sm">· Preise sind grobe Richtwerte</span></div>
      <div class="btnrow noprint"><button class="btn ghost" data-act="copy">Kopieren</button><button class="btn ghost" data-act="csv">CSV</button><button class="btn ghost" data-act="print">Drucken</button></div></section>`;
    return out + (sh.items.length ? orderPanel() : '') + resetCard();
  }

  /* ---------- Rezeptbuch: Bibliothek, Detail, eigene Rezepte ---------- */
  const pageHead = (title, sub, extra) => `<div class="ph"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${extra || ''}</div>`;
  const BOOK_CATS = ['Frühstück', 'Hauptgericht', 'Snack', 'Backen'];
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
    const m = t.match(/^([\d.,½¼¾\/]+)?\s*(kg|g|ml|l|EL|TL|Stk|Zehen?|Prise|Bund|Dose|Becher|Pck)?\.?\s+(.+)$/i);
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
  function linkIng(p) {
    if (p.id || p.qty == null) return p;
    const n = KA.norm(p.name);
    const ing = Object.values(ING).find((i) => KA.norm(i.name) === n);
    if (!ing) return p;
    const u = (p.unit || '').toLowerCase();
    const ok = ing.unit === 'g' ? ['g', 'kg'] : ing.unit === 'ml' ? ['ml', 'l'] : ['stk'];
    if (!ok.includes(u)) return p;
    return { id: ing.id, qty: KA.toBase(p.qty, u), unit: ing.unit, name: ing.name };
  }

  const hash = (s) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const builtinCat = (r) => (r.types.includes('m') || r.types.includes('a') ? 'Hauptgericht' : r.types.includes('f') ? 'Frühstück' : 'Snack');
  // Einheitliche Sicht auf mitgelieferte und eigene Rezepte
  function bookRecipe(id) {
    const r = REC[id];
    if (!r || r.user) return S.my.find((x) => x.id === id) || null;
    return {
      id, title: r.name, cat: builtinCat(r), time: r.time, serv: r.s, source: 'Kochapp', builtin: true, tone: hash(id) % TONES.length,
      ings: r.i.map(([iid, a]) => ({ id: iid, qty: a, unit: ING[iid].unit, name: ING[iid].name })), steps: r.st,
    };
  }
  const builtins = () => KA.RECIPES.filter((r) => !r.user);
  const allBook = () => S.my.concat(builtins().map((r) => bookRecipe(r.id)));

  // Eigene Rezepte in Finder und Wochenplan bereitstellen; Verweise auf gelöschte Rezepte aufräumen
  let usableMine = 0;
  function syncRecipes() {
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
  const finderList = (sel) => KA.shoppingForRecipes(sel, S.pantry, S.prefs)
    .concat(freeItems(sel.map((rid) => ({ rid, k: (S.prefs.persons || 2) / REC[rid].s }))));
  const planList = () => KA.planShopping(S.plan, S.prefs, S.pantry, S.subPantry)
    .concat(freeItems(S.plan.days.reduce((all, day) => all.concat(day.map((m) => ({ rid: m.rid, k: (m.f * (S.prefs.persons || 1)) / REC[m.rid].s }))), [])));
  const srcLabel = (r) => (r.source === 'Web' ? 'Web · ' + r.domain : r.source);
  const ingQty = (i, f) => (i.qty == null ? i.unit || '' : i.id ? KA.fmtAmount(i.id, i.qty * f) : fmtQ(i.qty * f, i.unit));
  const toneStyle = (r) => `--a:${TONES[r.tone % TONES.length][0]};--b:${TONES[r.tone % TONES.length][1]}`;
  const recImg = (r) => (r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}">` : '');

  function libFiltered() {
    const q = KA.norm(ui.query);
    return allBook().filter((r) => (ui.filter === 'Alle' || (ui.filter === 'Eigene' ? !r.builtin : r.cat === ui.filter)) &&
      (!q || KA.norm(r.title).includes(q) || r.ings.some((i) => KA.norm(i.name).includes(q))));
  }
  function bookCards() {
    const list = libFiltered();
    if (!list.length) return '<p class="muted">Kein Rezept gefunden.</p>';
    return list.map((r) => {
      const inL = S.list.some((l) => l.id === r.id);
      return `<div class="bcard" role="button" tabindex="0" data-act="openrec" data-id="${esc(r.id)}">
        <div class="thumb" style="${toneStyle(r)}">${recImg(r)}</div>
        <div class="bc-t"><span>${esc(srcLabel(r))}</span><b>${esc(r.title)}</b><span>${r.time} Min · ${r.serv} Pers.</span></div>
        <button class="lbtn ${inL ? 'on' : ''}" data-act="addlist" data-id="${esc(r.id)}">${inL ? '✓ Auf Liste' : '+ Liste'}</button></div>`;
    }).join('');
  }

  function viewLibrary() {
    const n = S.my.length + builtins().length;
    return `<div class="ph"><div><h1>Meine Rezepte</h1><p>${n} Rezepte · ${S.my.length} eigene</p></div>
        <input id="bk-q" class="search" value="${esc(ui.query)}" aria-label="Rezept oder Zutat suchen" placeholder="Rezept oder Zutat suchen …" autocomplete="off"></div>
      <div class="fchips">${['Alle'].concat(BOOK_CATS, ['Eigene']).map((f) => `<button class="${ui.filter === f ? 'on' : ''}" data-act="bookfilter" data-v="${f}">${f}</button>`).join('')}</div>
      <div class="bgrid" id="bk-cards">${bookCards()}</div>`;
  }

  function viewDetail() {
    const r = bookRecipe(ui.selId);
    const f = ui.detailServ / r.serv;
    const inL = S.list.find((l) => l.id === r.id);
    const base = r.builtin ? REC[r.id] : null;
    const fact = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    return `<div class="detail">
      <button class="back" data-act="booklib">← Alle Rezepte</button>
      <div class="dt-top"><div class="dt-info">
        <div class="pills2"><span class="acc">${esc(r.cat)}</span><span>${esc(srcLabel(r))}</span></div>
        <h1>${esc(r.title)}</h1>
        <div class="facts">${fact('Zeit', r.time + ' Min')}${fact('Zutaten', r.ings.length)}${fact('Original', r.serv + ' Pers.')}
          ${base ? fact('Pro Portion', r0(KA.recipeNutr(base)[0]) + ' kcal') + fact('Niveau', DIFF[base.diff]) : ''}</div>
        ${base ? `<div class="tags">${recipeTags(base)}</div>` : ''}
        <div class="servbox"><span class="muted">Portionen</span>
          <div class="step"><button data-act="dserv" data-d="-1" aria-label="Weniger">−</button><span>${persons(ui.detailServ)}</span><button data-act="dserv" data-d="1" aria-label="Mehr">+</button></div>
          <button class="btn dark" data-act="addlistd">${inL ? (inL.serv === ui.detailServ ? '✓ Auf der Liste' : 'Liste aktualisieren') : 'Auf Einkaufsliste'}</button></div>
        ${r.builtin ? '' : `<p class="muted sm">${REC[r.id]
          ? `Im Vorrats-Finder und Wochenplan nutzbar – ${REC[r.id].i.length} von ${r.ings.length} Zutaten sind mit Nährwerten verknüpft.`
          : 'Nicht im Vorrats-Finder und Wochenplan nutzbar: Keine Zutat ist mit der Lebensmittelliste verknüpft (Name wie bei „Mein Vorrat“, Menge in g, ml oder Stk).'}</p>`}
      </div><div class="dt-img" style="${toneStyle(r)}">${recImg(r)}</div></div>
      <div class="dt-body">
        <div class="card ingcard"><div class="lh"><h2>Zutaten</h2><span class="muted sm">für ${persons(ui.detailServ)}</span></div>
          ${r.ings.map((i) => `<div class="irow"><span class="${f !== 1 ? 'chg' : ''}">${esc(ingQty(i, f))}</span><span>${esc(i.name)}</span></div>`).join('')}</div>
        <div><h2>Zubereitung</h2>
          ${r.steps.length ? r.steps.map((s, k) => `<div class="srow"><span>${k + 1}</span><p>${esc(s)}</p></div>`).join('') : '<p class="muted">Keine Schritte hinterlegt.</p>'}
          ${r.builtin ? '' : '<div class="btnrow"><button class="btn ghost" data-act="delrec">Rezept löschen</button></div>'}</div>
      </div></div>`;
  }

  /* ---------- Neues Rezept: selbst schreiben, Foto-Scan (Demo), Linkimport (Demo) ---------- */
  const SCAN = { title: 'Kartoffelsalat nach Tante Hilde', serv: 6, time: 45, cat: 'Hauptgericht',
    ings: [{ text: '1 kg Kartoffeln' }, { text: '1 Stk Zwiebel' }, { text: '150 ml Gemüsebrühe' }, { text: '3 EL Weißweinessig' },
      { text: '1 EL Senf', flag: true, note: 'Menge war schwer lesbar – „1 EL“ oder „4 EL“?' }, { text: '4 EL Sonnenblumenöl' }, { text: '1 Bund Schnittlauch' }],
    steps: ['Kartoffeln mit Schale gar kochen, pellen und noch warm in Scheiben schneiden.', 'Zwiebel fein würfeln und in der Brühe kurz aufkochen.',
      'Brühe mit Essig, Senf und Öl verrühren und über die warmen Kartoffeln gießen.', 'Mindestens 30 Minuten ziehen lassen, mit Schnittlauch bestreuen.'] };
  const LINK = { title: 'Kürbis-Curry mit Kichererbsen', cat: 'Hauptgericht', time: 35, serv: 4, source: 'Web', domain: 'kochblog.de',
    ings: ['800 g Hokkaido-Kürbis', '1 Dose Kichererbsen', '400 ml Kokosmilch', '1 Stk Zwiebel', '2 Zehen Knoblauch', '1 EL rote Currypaste', '1 Stk Limette', '0.5 Bund Koriander'].map(parseLine),
    steps: ['Kürbis entkernen und in 2 cm Würfel schneiden, Zwiebel und Knoblauch hacken.', 'Zwiebel und Knoblauch anschwitzen, Currypaste 1 Minute mitrösten.',
      'Kürbis, Kokosmilch und 200 ml Wasser zugeben, 15 Minuten köcheln.', 'Kichererbsen untermischen, mit Limettensaft abschmecken und mit Koriander servieren.'] };
  const ADD_MODES = [['manual', '01', 'Selbst schreiben', 'Zutaten einfach eintippen – Mengen werden automatisch erkannt.'],
    ['photo', '02', 'Foto scannen (Demo)', 'Demo mit einem Beispielrezept; keine echte Texterkennung.'],
    ['link', '03', 'Linkimport (Demo)', 'Demo mit einem Beispielrezept; kein echter Webimport.']];
  let demoTimer;

  const previewHTML = (text) => {
    if (!text.trim()) return '';
    const p = parseLine(text);
    return `<span>Erkannt:</span><b>${esc(p.qty != null ? fmtQ(p.qty, '') : '–')}</b><b>${esc(p.unit || '–')}</b><b>${esc(p.name)}</b>
      <span>${linkIng(p).id ? '✓ Nährwerte bekannt' : '· ohne Nährwerte (zählt nicht für Finder & Wochenplan)'}</span>`;
  };
  const stepList = (steps, removable) => steps.map((s, k) => `<div class="lrow st"><span class="no">${k + 1}</span><span>${esc(s)}</span>${removable ? `<button class="x" data-act="delstep" data-i="${k}" title="Entfernen">×</button>` : ''}</div>`).join('');
  const ingList = (ings, removable) => ings.map((i, k) => `<div class="lrow"><b>${esc(ingQty(i, 1))}</b><span>${esc(i.name)}</span>${removable ? `<button class="x" data-act="deling" data-i="${k}" title="Entfernen">×</button>` : ''}</div>`).join('');

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
        </div></div>
        <label class="drop">Titelbild wählen<input id="d-img" type="file" accept="image/jpeg,image/png,image/webp">${d.image ? `<img src="${esc(d.image)}" alt="Titelbild-Vorschau">` : ''}<span>JPG, PNG oder WebP – wird verkleinert gespeichert</span></label>
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
    let body = '';
    if (l.phase === 'busy') body = '<p class="muted busy">Seite laden · Rezeptdaten finden · Zutaten & Schritte übernehmen …</p>';
    if (l.phase === 'done') {
      body = `<div class="linkres"><div class="lk-top"><div class="dt-img sm" style="--a:#FFF1D6;--b:#FBE6BE"></div>
          <div class="col"><span class="muted">${esc(LINK.domain)}</span><div class="big">${esc(LINK.title)}</div>
            <div class="pills2">${['Titel', LINK.serv + ' Portionen', LINK.time + ' Min', LINK.ings.length + ' Zutaten', LINK.steps.length + ' Schritte'].map((c) => `<span class="acc">✓ ${c}</span>`).join('')}</div>
            <span class="muted sm">Ignoriert: Einleitungstext, Werbung, Kommentare</span></div></div>
        <div class="am-two"><div class="col"><div class="flabel">Zutaten · ${LINK.serv} Pers.</div><div>${ingList(LINK.ings)}</div></div>
          <div class="col"><div class="flabel">Zubereitung</div><div>${stepList(LINK.steps)}</div></div></div>
        <div class="btnrow end"><button class="btn ghost" data-act="linkreset">Verwerfen</button><button class="btn" data-act="linksave">Ins Rezeptbuch speichern</button></div></div>`;
    }
    return `<div class="card addcard"><div class="col"><div class="flabel">Link zum Rezept</div>
      <div class="addrow"><input id="l-url" value="${esc(l.url)}" placeholder="https://www.kochblog.de/rezepte/kuerbis-curry" autocomplete="off"><button class="btn" data-act="linkfetch">Beispiel anzeigen</button></div>
      <span class="muted sm">Demo: Es wird ein festes Beispiel angezeigt. Der eingegebene Link wird nicht abgerufen.</span></div>${body}</div>`;
  }

  function viewAdd() {
    return pageHead('Neues Rezept', 'Wie möchtest du das Rezept hinzufügen?') +
      `<div class="addtabs">${ADD_MODES.map(([k, num, label, desc]) => `<button class="${ui.addMode === k ? 'on' : ''}" data-act="addmode" data-v="${k}"><i>${num}</i><b>${label}</b><span>${desc}</span></button>`).join('')}</div>` +
      { manual: addManual, photo: addPhoto, link: addLink }[ui.addMode]();
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
  function bookAgg() {
    const agg = {};
    S.list.forEach((l) => {
      const r = bookRecipe(l.id);
      if (!r) return;
      const f = l.serv / r.serv;
      r.ings.forEach((i) => {
        if (i.id && S.prefs.assumeStaples && ING[i.id].staple) return;
        const key = i.id ? 'i|' + i.id : 'x|' + KA.norm(i.name) + '|' + (i.unit || '');
        const a = agg[key] || (agg[key] = { key, id: i.id || null, name: i.name, unit: i.unit || '', cat: i.id ? ING[i.id].cat : 'SO', qty: 0, from: [] });
        if (i.qty != null) a.qty += i.qty * f;
        if (!a.from.includes(r.title)) a.from.push(r.title);
      });
    });
    S.extras.forEach((name) => {
      const key = 'e|' + KA.norm(name);
      agg[key] = { key, id: null, name, unit: '', cat: 'SO', qty: 0, from: ['Manuell hinzugefügt'], extra: true };
    });
    return Object.values(agg);
  }
  const aggQty = (a) => (!a.qty ? '' : a.id ? KA.fmtAmount(a.id, a.qty) : fmtQ(a.qty, a.unit));
  const aggGroups = (items) => Object.keys(CATS).map((c) => [c, items.filter((a) => a.cat === c)
    .sort((a, b) => !!S.done[a.key] - !!S.done[b.key] || a.name.localeCompare(b.name, 'de'))]).filter((g) => g[1].length);

  function drawer() {
    if (!ui.listOpen) return '';
    const items = bookAgg();
    const open = items.filter((a) => !S.done[a.key]).length;
    return `<div class="scrim" data-act="closelist"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Einkaufsliste">
      <div class="dr-head"><h2>Einkaufsliste</h2><div><span class="muted sm">${open} von ${items.length} offen</span><button class="sq" data-act="closelist" aria-label="Schließen">×</button></div></div>
      <div class="dr-sec"><span class="slabel">Für diese Rezepte</span>
        ${S.list.length ? '' : '<span class="muted sm">Noch keine Rezepte. Füge eins über „+ Liste“ hinzu.</span>'}
        ${S.list.map((l) => `<div class="dr-rec"><span class="t">${esc(bookRecipe(l.id).title)}</span>
          <div class="step sm"><button data-act="listserv" data-id="${esc(l.id)}" data-d="-1" aria-label="Weniger">−</button><span>${l.serv} Pers.</span><button data-act="listserv" data-id="${esc(l.id)}" data-d="1" aria-label="Mehr">+</button></div>
          <button class="x" data-act="listdel" data-id="${esc(l.id)}" title="Von der Liste nehmen">×</button></div>`).join('')}</div>
      <div class="dr-add"><input id="extra-in" placeholder="+ Artikel hinzufügen" autocomplete="off"></div>
      <div class="dr-items">${aggGroups(items).map(([c, list]) => `<div><span class="slabel">${esc(CATS[c])}</span>
        ${list.map((a) => `<div class="dr-it ${S.done[a.key] ? 'done' : ''}" data-act="listchk" data-k="${esc(a.key)}"><span class="box">✓</span>
          <div><span class="n">${esc(a.name)}</span><span class="f">${esc(a.from.join(', '))}</span></div><span class="q">${esc(aggQty(a))}</span>
          ${a.extra ? `<button class="x" data-act="extradel" data-n="${esc(a.name)}" title="Entfernen">×</button>` : ''}</div>`).join('')}</div>`).join('')}</div>
      <div class="dr-foot"><button class="btn ghost" data-act="listreset">Häkchen zurücksetzen</button><button class="btn ghost" data-act="listdl">Herunterladen</button>
        <button class="btn dark" data-act="listtoshop" ${items.length ? '' : 'disabled'}>Drucken & bestellen →</button></div>
    </aside>`;
  }

  /* ---------- Render ---------- */
  const TABS = [['book', 'Rezeptbuch', 'Rezepte'], ['finder', 'Rezepte aus Vorrat', 'Vorrat'], ['plan', 'Wochenplan', 'Plan'], ['shop', 'Vorrat & Einkauf', 'Einkauf']];
  function chrome() {
    const open = bookAgg().filter((a) => !S.done[a.key]).length;
    const book = allBook();
    const count = { book: book.length, shop: S.shop ? S.shop.items.length : '' };
    const inLib = S.tab === 'book' && ui.book === 'library';
    $('#side').innerHTML = `<div class="brand"><b>Kochapp</b><span>Rezepte · Vorrat · Wochenplan</span></div>
      <button class="newbtn" data-act="bookadd"><span>+</span>Neues Rezept</button>
      <nav class="snav">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}"><span>${l}</span><i>${count[k] == null ? '' : count[k]}</i></button>`).join('')}
        <button class="${ui.listOpen ? 'on' : ''}" data-act="openlist"><span>Einkaufsliste</span><i>${open}</i></button></nav>
      <div class="snav"><div class="slabel">Sammlungen</div>${BOOK_CATS.concat(['Eigene']).map((c) =>
        `<button class="${inLib && ui.filter === c ? 'on' : ''}" data-act="bookfilter" data-v="${c}"><span>${c}</span><i>${book.filter((r) => (c === 'Eigene' ? !r.builtin : r.cat === c)).length}</i></button>`).join('')}</div>`;
    $('#mtop').innerHTML = '<b>Kochapp</b><button data-act="bookadd" aria-label="Neues Rezept">+</button>';
    $('#tabbar').innerHTML = TABS.map(([k, , l]) => `<button class="${S.tab === k && !ui.listOpen ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('') +
      `<button class="${ui.listOpen ? 'on' : ''}" data-act="openlist">Liste<i>${open || ''}</i></button>`;
  }
  function render() {
    syncRecipes();
    const y = window.scrollY;
    const old = $('.drawer');
    const dy = old ? old.scrollTop : 0;
    // angefangene Eingaben über den Neuaufbau retten
    const keep = ['d-ing', 'd-step', 'extra-in'].map((id) => [id, $('#' + id) ? $('#' + id).value : '']);
    $('#view').innerHTML = { book: viewBook, finder: viewFinder, plan: viewPlan, shop: viewShop }[S.tab]();
    chrome();
    $('#overlay').innerHTML = drawer();
    if ($('.drawer')) $('.drawer').scrollTop = dy;
    keep.forEach(([id, v]) => { if (v && $('#' + id)) $('#' + id).value = v; });
    if ($('#d-ing')) $('#d-prev').innerHTML = previewHTML($('#d-ing').value);
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

  function findIngredient(q) {
    const n = KA.norm(q);
    if (!n) return null;
    const all = Object.values(ING);
    return all.find((i) => KA.norm(i.name) === n || i.id === n) ||
      all.find((i) => KA.norm(i.name).startsWith(n)) ||
      all.find((i) => KA.norm(i.name).includes(n));
  }

  function genPlan() {
    const m = S.prefs.macro;
    if (m.enabled && m.p + m.c + m.f !== 100) { ui.planError = 'Das Makro-Verhältnis muss zusammen 100 % ergeben.'; return; }
    const out = KA.generatePlan(S.prefs, S.plan && S.plan.sig === KA.planSig(S.prefs) ? S.plan : null);
    if (out.error) { ui.planError = out.error; if (!S.plan) S.plan = null; return; }
    ui.planError = '';
    S.plan = out.plan;
  }

  const A = {
    tab: (el) => { S.tab = el.dataset.v; ui.book = 'library'; ui.listOpen = false; update(); window.scrollTo(0, 0); },

    /* Rezeptbuch */
    booklib: () => { S.tab = 'book'; ui.book = 'library'; ui.filter = 'Alle'; update(); window.scrollTo(0, 0); },
    bookfilter: (el) => { S.tab = 'book'; ui.book = 'library'; ui.filter = el.dataset.v; update(); },
    bookadd: () => { S.tab = 'book'; ui.book = 'add'; ui.listOpen = false; update(); window.scrollTo(0, 0); },
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
      saveRecipe({ title: d.title.trim(), cat: d.cat, diff: d.diff, time: Number(d.time) || 30, serv: d.serv, source: 'Eigenes', ings: d.ings, steps: d.steps, image: d.image });
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
    linkfetch: () => {
      clearTimeout(demoTimer);
      ui.link.phase = 'busy'; render();
      demoTimer = setTimeout(() => { ui.link.phase = 'done'; render(); }, 1500);
    },
    linkreset: () => { clearTimeout(demoTimer); ui.link = { url: '', phase: 'idle' }; render(); },
    linksave: () => { ui.link = { url: '', phase: 'idle' }; saveRecipe(JSON.parse(JSON.stringify(LINK))); },

    /* Einkaufsliste des Rezeptbuchs */
    openlist: () => { ui.listOpen = true; render(); },
    closelist: () => { ui.listOpen = false; render(); },
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
    listreset: () => { S.done = {}; update(); },
    listdl: () => {
      const text = aggGroups(bookAgg()).map(([c, list]) => CATS[c] + '\n' + list.map((a) => `[${S.done[a.key] ? 'x' : ' '}] ${(aggQty(a) + ' ' + a.name).trim()}`).join('\n')).join('\n\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      a.download = 'Einkaufsliste.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    // Übernimmt die Rezeptbuch-Liste in „Vorrat & Einkauf“ (Drucken, CSV, Bestellen); Abgehaktes bleibt abgewählt
    listtoshop: () => {
      const order = Object.keys(CATS);
      const items = bookAgg().map((a) => {
        const checked = !S.done[a.key];
        if (!a.id) return { id: null, name: a.name, cat: 'SO', amount: a.qty ? Math.round(a.qty * 100) / 100 : null, unit: a.unit, label: aggQty(a), price: 0, checked };
        const amount = KA.buyAmount(a.id, a.qty);
        return { id: a.id, name: a.name, cat: a.cat, amount, unit: a.unit, price: KA.price(a.id, amount), checked };
      }).filter((i) => !i.id || i.amount > 0)
        .sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || a.name.localeCompare(b.name, 'de'));
      if (!items.length) { toast('Die Einkaufsliste ist leer.'); return; }
      S.shop = { source: 'Rezeptbuch', items, created: Date.now() };
      ui.orderResult = null; ui.listOpen = false; S.tab = 'shop'; update(); window.scrollTo(0, 0);
    },

    setTime: (el) => { S.prefs.maxTime = Number(el.dataset.v); update(); },
    setDiff: (el) => { S.prefs.maxDiff = Number(el.dataset.v); update(); },
    adddis: () => {
      const v = $('#dis-in').value.trim();
      if (v) v.split(/[,;]/).map((x) => x.trim()).filter(Boolean).forEach((x) => { if (!S.prefs.dislikes.includes(x)) S.prefs.dislikes.push(x); });
      ui.focus = 'dis-in'; update();
    },
    deldis: (el) => { S.prefs.dislikes.splice(Number(el.dataset.i), 1); update(); },
    reset: () => { if (confirm('Wirklich alle gespeicherten Daten löschen?')) { S = DEF(); update(); toast('Zurückgesetzt'); } },
    addp: () => {
      const ing = findIngredient($('#p-name').value);
      const amt = parseFloat(String($('#p-amt').value).replace(',', '.'));
      if (!ing) { toast('Lebensmittel nicht gefunden – bitte aus der Vorschlagsliste wählen.'); return; }
      if (!(amt > 0)) { toast('Bitte eine Menge eingeben.'); return; }
      S.pantry[ing.id] = (S.pantry[ing.id] || 0) + KA.toBase(amt, $('#p-unit').value);
      ui.focus = 'p-name'; update();
    },
    delp: (el) => { delete S.pantry[el.dataset.id]; update(); },
    demop: () => { S.pantry = Object.assign({}, KA.DEMO_PANTRY); S.sel = []; update(); },
    clearp: () => { S.pantry = {}; S.sel = []; update(); },
    togglesel: (el) => {
      const id = el.dataset.id;
      S.sel = S.sel.includes(id) ? S.sel.filter((x) => x !== id) : S.sel.concat(id);
      update();
    },
    takecombo: () => { S.sel = KA.bestCombo(S.pantry, S.prefs, S.comboN); update(); },
    clearsel: () => { S.sel = []; update(); },
    cook: (el) => {
      S.pantry = KA.cookRecipe(el.dataset.id, S.pantry, S.prefs);
      S.sel = S.sel.filter((x) => x !== el.dataset.id);
      update(); toast('Vorrat aktualisiert');
    },
    tofinderlist: () => {
      S.shop = { source: 'Rezepte (Reste zum Vorrat)', items: finderList(S.sel.filter((id) => REC[id])), created: Date.now() };
      ui.orderResult = null; S.tab = 'shop'; update(); window.scrollTo(0, 0);
    },
    setMacro: (el) => { const v = MACRO_PRESETS[el.dataset.v]; Object.assign(S.prefs.macro, { enabled: true, p: v[1], c: v[2], f: v[3] }); update(); },
    genplan: () => { genPlan(); update(); },
    toplanlist: () => {
      S.shop = { source: 'Wochenplan', items: planList(), created: Date.now() };
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
    chk: (el) => { S.shop.items[Number(el.dataset.i)].checked = el.checked; update(); },
    delitem: (el) => { S.shop.items.splice(Number(el.dataset.i), 1); update(); },
    copy: async () => { toast((await copyText(KA.listToText(S.shop.items, null))) ? 'Liste kopiert' : 'Kopieren nicht möglich'); },
    csv: () => {
      const rows = [['Kategorie', 'Artikel', 'Menge', 'Einheit', 'Preis (EUR)']].concat(
        S.shop.items.filter((i) => i.checked !== false).map((i) => [CATS[i.cat], i.name, i.amount == null ? '' : String(i.amount).replace('.', ','), i.unit, i.price.toFixed(2).replace('.', ',')]));
      const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'einkaufsliste.csv'; document.body.appendChild(a); a.click(); a.remove();
    },
    print: () => window.print(),
    preview: () => { ui.preview = !ui.preview; render(); },
    order: async () => {
      const o = S.order;
      const prov = KA.Providers[o.provider];
      const items = S.shop.items.filter((i) => i.checked !== false);
      if (!items.length) { toast('Keine Artikel ausgewählt.'); return; }
      if (o.provider !== 'mock' && !confirm(`${items.length} Artikel jetzt über „${prov.label}“ bestellen?`)) return;
      ui.ordering = true; ui.orderResult = null; render();
      try { ui.orderResult = await prov.submit(items, o.cfg[o.provider] || {}, o.customer); } catch (e) { ui.orderResult = { ok: false, message: e.message }; }
      ui.ordering = false; save(); render();
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.disabled) return;
    const f = A[el.dataset.act];
    if (f) f(el, e);
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'd-img') { if (t.files[0]) readImage(t.files[0], (url) => { ui.draft.image = url; render(); }); return; }
    if (t.dataset.act && t.tagName === 'INPUT') { A[t.dataset.act](t, e); return; }
    if (t.dataset.diet) {
      const s = new Set(S.prefs.diets);
      t.checked ? s.add(t.dataset.diet) : s.delete(t.dataset.diet);
      S.prefs.diets = Object.keys(DIETS).filter((k) => s.has(k));
      update(); return;
    }
    if (t.dataset.meal) { S.prefs.meals[t.dataset.meal] = t.checked ? 1 : 0; update(); return; }
    if (t.classList.contains('pamt')) {
      const v = parseFloat(t.value);
      if (v > 0) S.pantry[t.dataset.id] = v; else delete S.pantry[t.dataset.id];
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
    if (t.id === 'bk-q') { ui.query = t.value; $('#bk-cards').innerHTML = bookCards(); return; }
    if (t.id === 'd-title') { ui.draft.title = t.value; return; }
    if (t.id === 'd-time') { t.value = t.value.replace(/\D/g, ''); ui.draft.time = t.value; return; }
    if (t.id === 'd-ing') { $('#d-prev').innerHTML = previewHTML(t.value); return; }
    if (t.id === 's-title') { ui.scan.title = t.value; return; }
    if (t.dataset.si) { ui.scan.ings[Number(t.dataset.si)].text = t.value; return; }
    if (t.id === 'l-url') { ui.link.url = t.value; return; }
    if (e.target.id === 'p-name') {
      const ing = findIngredient(e.target.value);
      const u = $('#p-unit');
      if (ing && u) u.innerHTML = (ing.unit === 'g' ? ['g', 'kg'] : ing.unit === 'ml' ? ['ml', 'l'] : ['Stk']).map((x) => `<option>${x}</option>`).join('');
    }
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key === 'Escape' && ui.listOpen && !$('#dlg').open) { A.closelist(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && t.classList.contains('bcard')) { e.preventDefault(); openRecipe(t.dataset.id); return; }
    if (e.key !== 'Enter') return;
    if (t.id === 'd-ing' && t.value.trim()) { ui.draft.ings.push(parseLine(t.value)); t.value = ''; ui.focus = 'd-ing'; render(); return; }
    if (t.id === 'd-step' && t.value.trim()) { ui.draft.steps.push(t.value.trim()); t.value = ''; ui.focus = 'd-step'; render(); return; }
    if (t.id === 'extra-in') { A.addextra(); return; }
    if (t.id === 'l-url') { A.linkfetch(); return; }
    if (['p-name', 'p-amt'].includes(e.target.id)) A.addp();
    if (e.target.id === 'dis-in') A.adddis();
  });
  document.addEventListener('toggle', (e) => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    e.target.open ? ui.open.add(k) : ui.open.delete(k);
  }, true);
  $('#dlg').addEventListener('click', (e) => { if (e.target.id === 'dlg') closeDlg(); });

  if (!['book', 'finder', 'plan', 'shop'].includes(S.tab)) S.tab = 'book';
  S.list = S.list.filter((l) => bookRecipe(l.id));
  render();
})();
