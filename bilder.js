/* dAIlykitchen – Rezeptbilder
 * Zeichnet zu jedem Rezept eine Illustration als SVG (läuft offline, keine Bilddateien nötig).
 * Bild-Angabe: 'art:farbe1,farbe2,farbe3' – z. B. 'pizza:tomate,kaese,kraut'.
 * Farben sind Namen aus FARBE oder Hex-Werte (#RRGGBB).
 */
(function (root) {
  const KA = (root.KA = root.KA || {});

  const FARBE = {
    tomate: '#D9442B', kaese: '#F2C14E', kraut: '#4E9A3A', salat: '#8BC34A', reis: '#F4EFE3', nudel: '#EBC97A',
    fleisch: '#8B4A2B', hack: '#7A3E26', haehnchen: '#D9A066', lachs: '#F08C6C', fisch: '#E9D8C4', garnele: '#F28A5B',
    curry: '#E0A030', schoko: '#5A3220', kakao: '#7A4A2E', beere: '#B0234A', erdbeere: '#E5484D', himbeere: '#D6336C',
    blaubeere: '#3F4C8C', kirsche: '#9E1B32', sahne: '#FFF8EC', vanille: '#F6E3A1', teig: '#E8B96A', kruste: '#C98A3E',
    apfel: '#F3E2A9', gruenapfel: '#9CC04A', banane: '#F5D76E', zitrone: '#F7E04B', limette: '#8CC63F', orange: '#F39C33',
    mango: '#F7B32B', pfirsich: '#F8B88B', kaffee: '#6F4A2E', milch: '#FAF6EE', tee: '#C58B3E', matcha: '#86B04A',
    pink: '#F28CA8', minze: '#9AD3A8', rotwein: '#7B1E2B', aperol: '#F26B21', bohne: '#6D2E2A', avocado: '#9BC25B',
    ei: '#FFFFFF', eigelb: '#F6B726', mais: '#F3C623', paprika: '#E04A2F', karotte: '#EE7F2D', kuerbis: '#E8892F',
    aubergine: '#5B3A6B', spinat: '#3E7A35', brot: '#D9A15B', sosse: '#B5652E', bruehe: '#E9C46A', linse: '#D2783A',
    kokos: '#F6F1E7', joghurt: '#F7F5F0', honig: '#E8A93A', nuss: '#A0703A', zimt: '#9A5B2E', wasser: '#CFE8F2',
    gurke: '#6FAE5A', lila: '#8E5BA8', rosa: '#F5B5C8', pilz: '#B89A7A', kartoffel: '#E8C872', zwiebel: '#E7D3B8',
    oliv: '#5E6B2E', sesam: '#F1E4C3', nori: '#2F3B2A', creme: '#F3E3C3', karamell: '#C77B30', zucker: '#FFFFFF',
    tortilla: '#EDCB8A', speck: '#C8574A', wurst: '#B5543A', mohn: '#3B3B48', pflaume: '#5E2A4F', rhabarber: '#D9566B',
    holunder: '#F2EBC9', wassermelone: '#F0596B', tapioka: '#3A2A24', gruen: '#7CB342', grau: '#B7B2A8',
    rote: '#9B2D4A', erbse: '#7DBB4A', kichererbse: '#E3C48E', zucchini: '#5E9C3A', pistazie: '#93C572',
  };
  const col = (c, d) => (c === 'keine' ? '' : !c ? d : c[0] === '#' ? c : FARBE[c] || d);

  // Kleine, reproduzierbare Zufallsfolge, damit jedes Rezept sein eigenes Bild behält
  function rng(seed) {
    let s = 7;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
  };
  const f1 = (x) => Math.round(x * 10) / 10;

  // ---------- Bausteine ----------
  const schatten = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".10"/>`;
  const teller = (cx, cy, r) => schatten(cx + 6, cy + 10, r, r * 0.96) +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FDFDFB" stroke="#E4E0D8" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r * 0.74}" fill="#F6F4EF"/>`;
  const schale = (cx, cy, r, c) => schatten(cx + 6, cy + 10, r, r * 0.96) +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c || '#F2EEE6'}" stroke="${shade(c || '#F2EEE6', -0.12)}" stroke-width="3"/>`;
  function punkte(R, n, cx, cy, rx, ry, farben, rmin, rmax) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R());
      s += `<circle cx="${f1(cx + Math.cos(a) * rx * d)}" cy="${f1(cy + Math.sin(a) * ry * d)}" r="${f1(rmin + R() * (rmax - rmin))}" fill="${farben[i % farben.length]}"/>`;
    }
    return s;
  }
  function blob(R, cx, cy, r, c, zacken) {
    const n = zacken || 9;
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rr = r * (0.82 + R() * 0.3);
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    let d = '';
    p.forEach((q, i) => {
      const nx = p[(i + 1) % n];
      const mx = (q[0] + nx[0]) / 2, my = (q[1] + nx[1]) / 2;
      d += (i ? '' : `M${f1((p[n - 1][0] + q[0]) / 2)},${f1((p[n - 1][1] + q[1]) / 2)}`) + `Q${f1(q[0])},${f1(q[1])} ${f1(mx)},${f1(my)}`;
    });
    return `<path d="${d}Z" fill="${c}"/>`;
  }
  const blaetter = (R, n, cx, cy, rx, ry, farben, gr) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()), w = (gr || 10) * (0.7 + R() * 0.6);
      s += `<ellipse cx="${f1(cx + Math.cos(a) * rx * d)}" cy="${f1(cy + Math.sin(a) * ry * d)}" rx="${f1(w)}" ry="${f1(w * 0.55)}" transform="rotate(${Math.round(R() * 180)} ${f1(cx + Math.cos(a) * rx * d)} ${f1(cy + Math.sin(a) * ry * d)})" fill="${farben[i % farben.length]}"/>`;
    }
    return s;
  };
  const glanz = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".35"/>`;

  // ---------- Motive ----------
  const ART = {
    teller(R, [a, b, c]) {
      return teller(200, 150, 112) + blob(R, 175, 145, 52, a) + blob(R, 238, 160, 34, b, 7) +
        punkte(R, 14, 185, 150, 70, 55, [c, shade(c, 0.2)], 3, 6) + glanz(160, 128, 18, 9);
    },
    pasta(R, [a, b, c]) {
      let s = teller(200, 150, 112);
      for (let i = 0; i < 26; i++) {
        const x = 136 + R() * 80, y = 104 + R() * 92, w = 24 + R() * 32;
        s += `<path d="M${f1(x)},${f1(y)} q${f1(w / 4)},${f1(-14 + R() * 28)} ${f1(w / 2)},0 t${f1(w / 2)},0" fill="none" stroke="${i % 3 ? a : shade(a, -0.1)}" stroke-width="6" stroke-linecap="round"/>`;
      }
      return s + blob(R, 200, 150, 40, b) + punkte(R, 16, 200, 150, 48, 40, [c, shade(c, 0.25)], 2.5, 5);
    },
    suppe(R, [a, b, c]) {
      return schale(200, 150, 110) + `<circle cx="200" cy="150" r="90" fill="${a}"/>` +
        punkte(R, 10, 200, 150, 62, 62, [b, shade(b, -0.12)], 7, 12) + blaetter(R, 8, 200, 150, 50, 50, [c], 6) + glanz(165, 120, 22, 9);
    },
    bowl(R, [a, b, c]) {
      let s = schale(200, 150, 110) + `<circle cx="200" cy="150" r="92" fill="#F4EFE3"/>`;
      const farben = [a, b, c, shade(a, 0.3)];
      for (let i = 0; i < 4; i++) {
        const w0 = (i * Math.PI) / 2 + 0.3, w1 = w0 + Math.PI / 2;
        s += `<path d="M200,150 L${f1(200 + Math.cos(w0) * 88)},${f1(150 + Math.sin(w0) * 88)} A88,88 0 0 1 ${f1(200 + Math.cos(w1) * 88)},${f1(150 + Math.sin(w1) * 88)}Z" fill="${farben[i]}"/>`;
        s += punkte(R, 6, 200 + Math.cos(w0 + 0.78) * 50, 150 + Math.sin(w0 + 0.78) * 50, 22, 22, [shade(farben[i], -0.15)], 3, 6);
      }
      return s + `<circle cx="200" cy="150" r="24" fill="${shade(b, 0.25)}"/>` + punkte(R, 10, 200, 150, 18, 18, ['#F1E4C3'], 1.5, 2.5);
    },
    salat(R, [a, b, c]) {
      return schale(200, 150, 110, '#FDFDFB') + blaetter(R, 46, 200, 150, 82, 82, ['#7CB342', '#8BC34A', '#5E9C3A', '#A5D06B'], 16) +
        punkte(R, 12, 200, 150, 70, 70, [a], 7, 11) + punkte(R, 10, 200, 150, 70, 70, [b], 5, 8) + punkte(R, 14, 200, 150, 70, 70, [c], 2, 4);
    },
    pizza(R, [a, b, c]) {
      let s = schatten(206, 160, 112, 108) + `<circle cx="200" cy="150" r="110" fill="${FARBE.kruste}"/><circle cx="200" cy="150" r="94" fill="${a}"/>`;
      s += punkte(R, 18, 200, 150, 78, 78, [b, shade(b, 0.2)], 9, 16) + blaetter(R, 12, 200, 150, 75, 75, [c], 7);
      for (let i = 0; i < 3; i++) { const w = (i * Math.PI) / 3; s += `<line x1="${f1(200 + Math.cos(w) * 110)}" y1="${f1(150 + Math.sin(w) * 110)}" x2="${f1(200 - Math.cos(w) * 110)}" y2="${f1(150 - Math.sin(w) * 110)}" stroke="${shade(FARBE.kruste, -0.2)}" stroke-width="2" opacity=".6"/>`; }
      return s;
    },
    burger(R, [a, b, c]) {
      const bun = FARBE.kruste;
      return schatten(200, 252, 120, 14) +
        `<rect x="95" y="205" width="210" height="38" rx="16" fill="${bun}"/>` +
        `<path d="M88,198 q30,16 56,0 t56,0 t56,0 t56,0 v10 h-224z" fill="#7CB342"/>` +
        `<rect x="92" y="170" width="216" height="34" rx="14" fill="${a}"/>` +
        `<path d="M96,166 h208 l-14,20 l-14,-8 l-16,16 l-12,-12 l-150,0z" fill="${b}"/>` +
        `<rect x="104" y="150" width="192" height="16" rx="6" fill="${c}"/>` +
        `<path d="M95,150 c0,-62 210,-62 210,0z" fill="${bun}"/>` + glanz(160, 112, 30, 10) +
        punkte(R, 12, 200, 118, 70, 18, [FARBE.sesam], 2, 3);
    },
    taco(R, [a, b, c]) {
      let s = '';
      [[140, 175], [260, 175]].forEach(([x, y]) => {
        s += schatten(x, y + 52, 70, 10) + `<path d="M${x - 72},${y + 40} a72,72 0 0 1 144,0z" fill="${FARBE.tortilla}" stroke="${shade(FARBE.tortilla, -0.15)}" stroke-width="3"/>`;
        s += blob(R, x - 6, y - 4, 34, a, 8) + blaetter(R, 8, x, y - 16, 40, 12, ['#7CB342', '#8BC34A'], 9) + punkte(R, 8, x, y - 12, 42, 12, [b, c], 4, 7);
      });
      return s;
    },
    wrap(R, [a, b, c]) {
      let s = '';
      [[150, 150], [258, 158]].forEach(([x, y]) => {
        s += schatten(x + 4, y + 50, 52, 10) + `<circle cx="${x}" cy="${y}" r="56" fill="${FARBE.tortilla}" stroke="${shade(FARBE.tortilla, -0.18)}" stroke-width="3"/>`;
        s += `<circle cx="${x}" cy="${y}" r="44" fill="${a}"/>` + blaetter(R, 7, x, y, 32, 32, ['#7CB342'], 9) + punkte(R, 10, x, y, 34, 34, [b, c], 4, 7);
      });
      return s;
    },
    toast(R, [a, b, c]) {
      const brot = '#E9C48A';
      return schatten(208, 248, 118, 14) +
        `<path d="M100,250 v-130 c-20,-6 -24,-62 30,-66 c40,-30 100,-30 140,0 c54,4 50,60 30,66 v130z" fill="${shade(brot, -0.2)}"/>` +
        `<path d="M112,240 v-118 c-14,-6 -14,-52 26,-56 c36,-24 88,-24 124,0 c40,4 40,50 26,56 v118z" fill="${brot}"/>` +
        blob(R, 200, 160, 64, a) + punkte(R, 12, 200, 160, 60, 50, [b], 6, 11) + punkte(R, 14, 200, 160, 60, 50, [c], 2, 4);
    },
    kuchen(R, [a, b, c]) {
      return teller(200, 170, 112) +
        `<path d="M110,200 L290,200 L290,128 L110,150Z" fill="${a}"/>` +
        `<path d="M110,176 L290,170 L290,180 L110,186Z" fill="${b}"/>` +
        `<path d="M110,150 L290,128 L290,116 L110,138Z" fill="${c}"/>` +
        `<path d="M110,200 L110,138 L96,140 L96,196Z" fill="${shade(a, -0.15)}"/>` +
        punkte(R, 3, 200, 112, 60, 4, [FARBE.erdbeere, FARBE.sahne], 7, 9);
    },
    torte(R, [a, b, c]) {
      let s = schatten(206, 160, 112, 108) + `<circle cx="200" cy="150" r="108" fill="${FARBE.kruste}"/><circle cx="200" cy="150" r="94" fill="${a}"/>`;
      if (b) {
        for (let i = -3; i <= 3; i++) {
          s += `<rect x="${200 + i * 26 - 6}" y="60" width="12" height="180" rx="5" fill="${b}" transform="rotate(35 200 150)" opacity=".95"/>`;
        }
      }
      return `<defs><clipPath id="t"><circle cx="200" cy="150" r="96"/></clipPath></defs>` + s.replace(/<rect /g, '<rect clip-path="url(#t)" ') +
        punkte(R, 10, 200, 150, 80, 80, [c], 4, 8);
    },
    muffin(R, [a, b, c]) {
      let s = '';
      [[140, 170], [262, 175]].forEach(([x, y]) => {
        s += schatten(x, y + 64, 56, 9) + `<path d="M${x - 46},${y} L${x - 36},${y + 62} L${x + 36},${y + 62} L${x + 46},${y}Z" fill="${c || '#F1E4C3'}"/>`;
        for (let i = -3; i <= 3; i++) s += `<line x1="${x + i * 12}" y1="${y + 2}" x2="${x + i * 10}" y2="${y + 60}" stroke="${shade(c || '#F1E4C3', -0.18)}" stroke-width="2"/>`;
        s += `<path d="M${x - 54},${y + 4} c-4,-70 112,-70 108,0z" fill="${a}"/>` + punkte(R, 9, x, y - 22, 34, 14, [b], 3, 5) + glanz(x - 20, y - 26, 12, 5);
      });
      return s;
    },
    kekse(R, [a, b]) {
      let s = '';
      [[140, 120, 50], [250, 112, 46], [196, 196, 54], [300, 196, 40], [100, 200, 38]].forEach(([x, y, r]) => {
        s += schatten(x + 4, y + 6, r, r * 0.95) + `<circle cx="${x}" cy="${y}" r="${r}" fill="${a}"/><circle cx="${x}" cy="${y}" r="${r - 4}" fill="${shade(a, 0.08)}"/>` +
          punkte(R, 6, x, y, r * 0.7, r * 0.7, [b], 3, 6);
      });
      return s;
    },
    brot(R, [a, b]) {
      let s = schatten(206, 220, 150, 22) + `<ellipse cx="200" cy="160" rx="150" ry="70" fill="${a}"/>` + `<ellipse cx="200" cy="150" rx="138" ry="56" fill="${shade(a, 0.12)}"/>`;
      for (let i = -2; i <= 2; i++) s += `<path d="M${200 + i * 48 - 18},${128} q18,22 36,44" fill="none" stroke="${shade(a, -0.25)}" stroke-width="7" stroke-linecap="round"/>`;
      return s + (b ? punkte(R, 24, 200, 150, 120, 46, [b], 1.5, 3) : '') + glanz(150, 120, 40, 10);
    },
    broetchen(R, [a, b]) {
      let s = '';
      [[130, 170], [270, 170], [200, 120]].forEach(([x, y]) => {
        s += schatten(x + 4, y + 40, 62, 12) + `<ellipse cx="${x}" cy="${y}" rx="64" ry="46" fill="${a}"/>` +
          `<path d="M${x - 30},${y - 4} q30,-18 60,0" fill="none" stroke="${shade(a, -0.25)}" stroke-width="6" stroke-linecap="round"/>` +
          (b ? punkte(R, 12, x, y - 10, 46, 26, [b], 1.5, 3) : '') + glanz(x - 22, y - 18, 16, 6);
      });
      return s;
    },
    pancakes(R, [a, b, c]) {
      let s = teller(200, 175, 112);
      for (let i = 0; i < 5; i++) s += `<ellipse cx="200" cy="${200 - i * 16}" rx="82" ry="26" fill="${shade(a, -0.12)}"/><ellipse cx="200" cy="${194 - i * 16}" rx="82" ry="24" fill="${a}"/>`;
      return s + `<path d="M140,128 q60,-26 120,0 q-10,30 -26,40 q-6,-20 -18,-12 q-20,8 -40,-4 q-14,14 -20,-6z" fill="${b}" opacity=".9"/>` +
        punkte(R, 7, 200, 118, 40, 8, [c], 6, 9);
    },
    glas(R, [a, b, c]) {
      let s = schatten(200, 262, 70, 10) +
        `<path d="M138,60 L262,60 L248,256 L152,256Z" fill="#EEF6F8" opacity=".55" stroke="#C9D6DA" stroke-width="3"/>` +
        `<path d="M143,100 L257,100 L247,250 L153,250Z" fill="${a}"/>`;
      if (b) s += `<path d="M143,100 L257,100 L255,122 L145,122Z" fill="${b}"/>`;
      s += `<rect x="168" y="130" width="26" height="26" rx="5" fill="#fff" opacity=".35" transform="rotate(14 181 143)"/><rect x="206" y="150" width="24" height="24" rx="5" fill="#fff" opacity=".3" transform="rotate(-10 218 162)"/>`;
      s += `<rect x="222" y="20" width="9" height="150" rx="4" fill="${FARBE.erdbeere}" transform="rotate(16 226 95)"/>`;
      if (c) s += `<circle cx="140" cy="68" r="26" fill="${c}"/><circle cx="140" cy="68" r="20" fill="${shade(c, 0.35)}"/>` +
        [0, 1, 2, 3, 4, 5].map((i) => `<line x1="140" y1="68" x2="${f1(140 + Math.cos(i) * 20)}" y2="${f1(68 + Math.sin(i) * 20)}" stroke="${c}" stroke-width="2"/>`).join('');
      return s + `<rect x="150" y="70" width="10" height="170" rx="5" fill="#fff" opacity=".4"/>`;
    },
    tasse(R, [a, b, c]) {
      const t = c || '#F2EEE6';
      return schatten(205, 252, 110, 14) + `<ellipse cx="200" cy="248" rx="110" ry="20" fill="#FDFDFB" stroke="#E4E0D8" stroke-width="2"/>` +
        `<path d="M270,140 c50,0 50,70 -6,70" fill="none" stroke="${t}" stroke-width="16"/>` +
        `<path d="M120,110 L280,110 L268,226 c-2,14 -14,22 -28,22 L160,248 c-14,0 -26,-8 -28,-22Z" fill="${t}" stroke="${shade(t, -0.12)}" stroke-width="2"/>` +
        `<ellipse cx="200" cy="110" rx="80" ry="20" fill="${shade(t, -0.12)}"/><ellipse cx="200" cy="112" rx="72" ry="16" fill="${a}"/>` +
        (b ? `<ellipse cx="200" cy="112" rx="50" ry="10" fill="${b}"/>` : '') +
        `<path d="M180,86 c-14,-16 14,-26 0,-46 M214,86 c-14,-16 14,-26 0,-46" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
    },
    dessert(R, [a, b, c]) {
      return schatten(200, 262, 80, 10) + `<rect x="190" y="200" width="20" height="54" fill="#E3EEF1"/><ellipse cx="200" cy="256" rx="56" ry="10" fill="#E3EEF1"/>` +
        `<path d="M110,70 L290,70 L270,190 c-6,16 -20,22 -34,22 L164,212 c-14,0 -28,-6 -34,-22Z" fill="#EEF6F8" opacity=".6" stroke="#C9D6DA" stroke-width="3"/>` +
        `<path d="M118,150 L282,150 L272,188 c-6,14 -18,18 -32,18 L160,206 c-14,0 -26,-4 -32,-18Z" fill="${a}"/>` +
        `<path d="M122,118 L278,118 L282,150 L118,150Z" fill="${b}"/>` +
        `<path d="M114,86 L286,86 L278,118 L122,118Z" fill="${shade(a, 0.35)}"/>` + punkte(R, 6, 200, 80, 60, 6, [c], 7, 10) + punkte(R, 5, 200, 80, 64, 6, ['#7CB342'], 3, 4);
    },
    spiesse(R, [a, b, c]) {
      let s = '';
      [110, 170, 230].forEach((y, k) => {
        s += schatten(204, y + 22, 140, 6) + `<line x1="40" y1="${y}" x2="360" y2="${y}" stroke="#C9A06A" stroke-width="5" stroke-linecap="round"/>`;
        [a, b, c, a, b].forEach((f, i) => { s += blob(R, 90 + i * 55 + (k % 2) * 10, y, 22, f, 6); });
      });
      return s;
    },
    dip(R, [a, b, c]) {
      let s = schale(200, 150, 70, '#FDFDFB') + `<circle cx="200" cy="150" r="56" fill="${a}"/>` + `<path d="M170,140 q30,-20 60,0 q-30,24 -60,0z" fill="${shade(a, -0.1)}"/>` +
        punkte(R, 8, 200, 150, 36, 36, [c || '#7CB342'], 2, 4);
      for (let i = 0; i < 9; i++) {
        const w = (i / 9) * Math.PI * 2 + R() * 0.3, x = 200 + Math.cos(w) * 108, y = 150 + Math.sin(w) * 100;
        s += `<rect x="${f1(x - 28)}" y="${f1(y - 8)}" width="56" height="16" rx="7" fill="${i % 2 ? b : shade(b, 0.18)}" transform="rotate(${Math.round((w * 180) / Math.PI)} ${f1(x)} ${f1(y)})"/>`;
      }
      return s;
    },
    ei(R, [a, b]) {
      let s = teller(200, 150, 112);
      [[165, 130], [240, 165]].forEach(([x, y]) => { s += blob(R, x, y, 44, '#FFFFFF', 8) + `<circle cx="${x + 4}" cy="${y}" r="17" fill="${FARBE.eigelb}"/>` + glanz(x - 2, y - 6, 6, 3); });
      return s + blob(R, 160, 205, 28, a, 7) + punkte(R, 10, 200, 150, 80, 70, [b || '#3a3a3a'], 1.5, 2.5);
    },
    rollen(R, [a, b, c]) {
      let s = '';
      [[125, 120], [205, 120], [285, 120], [165, 195], [245, 195]].forEach(([x, y]) => {
        s += schatten(x + 4, y + 8, 38, 36) + `<circle cx="${x}" cy="${y}" r="38" fill="${a}"/><circle cx="${x}" cy="${y}" r="31" fill="${b}"/>` +
          punkte(R, 3, x, y, 12, 12, [c], 7, 10);
      });
      return s;
    },
    auflauf(R, [a, b, c]) {
      return schatten(208, 160, 160, 100) + `<rect x="50" y="60" width="300" height="186" rx="36" fill="#FDFDFB" stroke="#E4E0D8" stroke-width="3"/>` +
        `<rect x="70" y="78" width="260" height="150" rx="24" fill="${a}"/>` + punkte(R, 26, 200, 153, 115, 64, [b, shade(b, -0.15)], 6, 14) +
        blaetter(R, 10, 200, 153, 110, 60, [c], 6);
    },
    kugeln(R, [a, b, c]) {
      let s = teller(200, 150, 112);
      [[160, 120], [228, 112], [262, 170], [196, 186], [140, 176], [204, 148]].forEach(([x, y]) => {
        s += `<circle cx="${x + 3}" cy="${y + 4}" r="24" fill="#000" opacity=".1"/><circle cx="${x}" cy="${y}" r="24" fill="${a}"/>` + punkte(R, 4, x, y, 14, 14, [b], 1.5, 3) + glanz(x - 8, y - 8, 6, 3);
      });
      return s + (c ? blaetter(R, 6, 200, 150, 90, 80, [c], 7) : '');
    },
    stuecke(R, [a, b, c]) {
      let s = '';
      [[90, 70], [210, 70], [150, 165], [270, 165]].forEach(([x, y]) => {
        s += `<rect x="${x + 5}" y="${y + 8}" width="96" height="80" rx="8" fill="#000" opacity=".1"/><rect x="${x}" y="${y}" width="96" height="80" rx="8" fill="${shade(a, -0.15)}"/>` +
          `<rect x="${x}" y="${y}" width="96" height="62" rx="8" fill="${a}"/>` + (b ? `<rect x="${x}" y="${y}" width="96" height="16" rx="6" fill="${b}"/>` : '') +
          punkte(R, 4, x + 48, y + 36, 36, 18, [c || shade(a, -0.3)], 2, 4);
      });
      return s;
    },
    gefaltet(R, [a, b, c]) {
      return teller(200, 150, 112) + `<path d="M110,190 L290,190 Q296,100 200,92 Q104,100 110,190Z" fill="${a}" stroke="${shade(a, -0.15)}" stroke-width="3"/>` +
        `<path d="M118,186 L282,186 Q250,150 200,148 Q150,150 118,186Z" fill="${shade(a, 0.12)}"/>` + punkte(R, 12, 200, 175, 70, 10, [b, c], 4, 7) + punkte(R, 18, 200, 140, 80, 40, [shade(a, -0.25)], 1.5, 3);
    },
    eis(R, [a, b, c]) {
      return schale(200, 160, 100, '#FDFDFB') + `<circle cx="160" cy="150" r="42" fill="${a}"/><circle cx="240" cy="150" r="42" fill="${b || shade(a, 0.3)}"/><circle cx="200" cy="198" r="42" fill="${c || shade(a, -0.15)}"/>` +
        glanz(148, 134, 12, 6) + glanz(228, 134, 12, 6) + glanz(188, 182, 12, 6) + `<path d="M260,100 l50,-50" stroke="#C98A3E" stroke-width="12" stroke-linecap="round"/>`;
    },
    pudding(R, [a, b, c]) {
      return teller(200, 160, 112) + blob(R, 200, 186, 70, b, 10) + `<path d="M140,190 c0,-90 120,-90 120,0z" fill="${a}"/>` + glanz(170, 140, 10, 18) +
        punkte(R, 4, 200, 112, 14, 6, [c], 7, 9) + `<ellipse cx="216" cy="106" rx="10" ry="5" fill="#7CB342" transform="rotate(-30 216 106)"/>`;
    },
    schnecken(R, [a, b, c]) {
      let s = '';
      [[140, 115], [260, 115], [140, 205], [260, 205], [200, 160]].forEach(([x, y]) => {
        s += schatten(x + 4, y + 6, 46, 44) + `<circle cx="${x}" cy="${y}" r="46" fill="${a}"/>` +
          `<path d="M${x},${y} m0,-6 a6,6 0 1 1 -6,6 a14,14 0 0 1 14,-14 a22,22 0 0 1 22,22 a30,30 0 0 1 -30,30 a38,38 0 0 1 -38,-38" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round"/>` +
          (c ? `<path d="M${x - 30},${y - 20} q30,12 60,0" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity=".9"/>` : '');
      });
      return s;
    },
    brezel(R, [a, b]) {
      const d = 'M200,236 C120,236 80,180 100,130 C120,80 200,90 200,150 C200,90 280,80 300,130 C320,180 280,236 200,236 M150,200 L250,120 M250,200 L150,120';
      return schatten(204, 248, 110, 10) + `<path d="${d}" fill="none" stroke="${shade(a, -0.2)}" stroke-width="34" stroke-linecap="round"/>` +
        `<path d="${d}" fill="none" stroke="${a}" stroke-width="26" stroke-linecap="round"/>` + punkte(R, 24, 200, 160, 100, 70, [b || '#FFFFFF'], 2, 3.5);
    },
    pommes(R, [a, b]) {
      let s = '';
      for (let i = 0; i < 12; i++) s += `<rect x="${126 + i * 13}" y="${40 + R() * 40}" width="14" height="140" rx="3" fill="${i % 2 ? a : shade(a, -0.1)}" transform="rotate(${Math.round(-12 + R() * 24)} ${133 + i * 13} 150)"/>`;
      return schatten(204, 258, 90, 10) + s + `<path d="M118,130 L282,130 L262,256 L138,256Z" fill="${b || FARBE.tomate}"/>` + `<path d="M118,130 L282,130 L278,150 L122,150Z" fill="#fff" opacity=".35"/>`;
    },
  };
  ART.eintopf = ART.suppe;
  ART.curry = (R, f) => ART.suppe(R, f);

  const cache = {};
  KA.dishImage = function (spec, seed) {
    const key = spec + '|' + seed;
    if (cache[key]) return cache[key];
    const [art, f] = String(spec || 'teller').split(':');
    const farben = (f || '').split(',');
    const fn = ART[art] || ART.teller;
    const R = rng(seed || spec);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${fn(R, [col(farben[0], '#E0A030'), col(farben[1], '#D9442B'), col(farben[2], '#4E9A3A')])}</svg>`;
    return (cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  };
  KA.DISH_ARTS = Object.keys(ART);
})(typeof window !== 'undefined' ? window : globalThis);
