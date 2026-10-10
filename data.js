/* Kochapp – Daten: Nährstoffe, Lebensmittel, Rezepte
 * Nährwerte sind gerundete Näherungswerte pro 100 g bzw. 100 ml (angelehnt an gängige
 * Nährwerttabellen). Sie dienen der Orientierung, nicht der medizinischen Beratung.
 */
(function (root) {
  const KA = (root.KA = root.KA || {});

  // Reihenfolge der Nährwert-Vektoren
  KA.NUTRIENTS = [
    { k: 'kcal',  label: 'Energie',     unit: 'kcal', group: 'macro' },
    { k: 'prot',  label: 'Eiweiß',      unit: 'g',    group: 'macro' },
    { k: 'carb',  label: 'Kohlenhydrate', unit: 'g',  group: 'macro' },
    { k: 'fat',   label: 'Fett',        unit: 'g',    group: 'macro' },
    { k: 'fiber', label: 'Ballaststoffe', unit: 'g',  group: 'macro' },
    { k: 'vitC',  label: 'Vitamin C',   unit: 'mg',   group: 'micro' },
    { k: 'vitA',  label: 'Vitamin A',   unit: 'µg',   group: 'micro' },
    { k: 'vitD',  label: 'Vitamin D',   unit: 'µg',   group: 'micro' },
    { k: 'b12',   label: 'Vitamin B12', unit: 'µg',   group: 'micro' },
    { k: 'folat', label: 'Folat',       unit: 'µg',   group: 'micro' },
    { k: 'ca',    label: 'Calcium',     unit: 'mg',   group: 'micro' },
    { k: 'fe',    label: 'Eisen',       unit: 'mg',   group: 'micro' },
    { k: 'mg',    label: 'Magnesium',   unit: 'mg',   group: 'micro' },
    { k: 'zn',    label: 'Zink',        unit: 'mg',   group: 'micro' },
    { k: 'k',     label: 'Kalium',      unit: 'mg',   group: 'micro' },
  ];

  KA.CATS = {
    OG: 'Obst & Gemüse',
    MI: 'Milch & Eier',
    FF: 'Fleisch & Fisch',
    GB: 'Getreide & Brot',
    HN: 'Hülsenfrüchte, Nüsse & Samen',
    KO: 'Konserven',
    BA: 'Öle, Gewürze & Basics',
    SO: 'Sonstiges',
  };

  // Ernährungsformen: ausgeschlossene Inhaltsstoff-Flags
  KA.DIETS = {
    vegan:        { label: 'Vegan',            excl: ['fleisch', 'fisch', 'schalentier', 'milch', 'ei', 'honig'] },
    vegetarisch:  { label: 'Vegetarisch',      excl: ['fleisch', 'fisch', 'schalentier'] },
    pescetarisch: { label: 'Pescetarisch',     excl: ['fleisch'] },
    glutenfrei:   { label: 'Glutenfrei',       excl: ['gluten'] },
    laktosefrei:  { label: 'Laktosefrei',      excl: ['milch'] },
    nussfrei:     { label: 'Nussfrei',         excl: ['nuss', 'erdnuss'] },
    eifrei:       { label: 'Eifrei',           excl: ['ei'] },
    sojafrei:     { label: 'Sojafrei',         excl: ['soja'] },
    sesamfrei:    { label: 'Sesamfrei',        excl: ['sesam'] },
    halal:        { label: 'Halal (ohne Schwein)', excl: ['schwein', 'alkohol'] },
    lowcarb:      { label: 'Low Carb',         macro: 'lowcarb' },
    highprotein:  { label: 'High Protein',     macro: 'highprotein' },
  };

  // [id, Name, Kategorie, Einheit, g pro Einheit, Preis €/kg|l|Stk, Flags, Nährwerte/100g, Basiszutat?]
  const ING_RAW = [
    // Getreide & Brot
    ['haferflocken', 'Haferflocken', 'GB', 'g', 1, 2.0, ['gluten'], [372,13.5,58.7,7,10,0,0,0,0,87,54,4.4,130,4,370]],
    ['vollkornnudeln', 'Vollkornnudeln', 'GB', 'g', 1, 2.8, ['gluten'], [350,13,66,2.5,8,0,0,0,0,40,30,3.5,100,2.5,380]],
    ['nudeln', 'Nudeln', 'GB', 'g', 1, 1.6, ['gluten'], [360,12.5,72,1.5,3,0,0,0,0,18,25,1.3,50,1.5,200]],
    ['reis', 'Reis', 'GB', 'g', 1, 2.5, [], [350,7.5,78,0.6,1,0,0,0,0,9,10,0.8,25,1.1,115]],
    ['quinoa', 'Quinoa', 'GB', 'g', 1, 7.0, [], [368,14,64,6,7,0,1,0,0,184,47,4.6,197,3.1,563]],
    ['couscous', 'Couscous', 'GB', 'g', 1, 3.0, ['gluten'], [360,12.5,73,1.6,5,0,0,0,0,24,24,1.1,44,0.8,166]],
    ['kartoffeln', 'Kartoffeln', 'OG', 'g', 1, 1.5, [], [77,2,17,0.1,2.2,19.7,0,0,0,16,12,0.8,23,0.3,421]],
    ['suesskartoffel', 'Süßkartoffel', 'OG', 'g', 1, 3.0, [], [86,1.6,20,0.1,3,2.4,709,0,0,11,30,0.6,25,0.3,337]],
    ['vollkornbrot', 'Vollkornbrot', 'GB', 'g', 1, 4.0, ['gluten'], [250,8.5,43,2,7,0,0,0,0,40,60,2.5,60,1.8,230]],
    ['tortilla', 'Weizen-Tortilla', 'GB', 'Stk', 60, 0.35, ['gluten'], [310,8,52,7,3,0,0,0,0,30,150,3,25,0.8,130]],
    ['mehl', 'Weizenmehl', 'GB', 'g', 1, 1.2, ['gluten'], [350,10,73,1,3,0,0,0,0,26,20,1.2,25,0.7,130]],
    // Hülsenfrüchte, Nüsse, Samen
    ['linsen', 'Rote Linsen', 'HN', 'g', 1, 3.0, [], [350,24,50,1.5,11,2,0,0,0,479,35,7.5,90,4,680]],
    ['kichererbsen', 'Kichererbsen (Dose)', 'KO', 'g', 1, 2.8, [], [140,8,20,2.5,6,1,1,0,0,100,50,2,35,1.3,250]],
    ['kidneybohnen', 'Kidneybohnen (Dose)', 'KO', 'g', 1, 2.5, [], [105,7,14,0.5,6,1,0,0,0,80,30,2.2,40,1,350]],
    ['tofu', 'Tofu', 'HN', 'g', 1, 7.0, ['soja'], [120,13,2,7,1,0,0,0,0,20,350,2.5,50,1.5,150]],
    ['erdnussmus', 'Erdnussmus', 'HN', 'g', 1, 8.0, ['erdnuss'], [600,25,13,50,6,0,0,0,0,80,50,2,170,3,650]],
    ['mandeln', 'Mandeln', 'HN', 'g', 1, 10.0, ['nuss'], [580,21,10,50,12,0,0,0,0,44,260,3.7,270,3.1,730]],
    ['walnuesse', 'Walnüsse', 'HN', 'g', 1, 12.0, ['nuss'], [650,15,7,65,7,1,1,0,0,98,98,2.9,158,3.1,441]],
    ['chia', 'Chiasamen', 'HN', 'g', 1, 12.0, [], [490,17,8,31,34,2,0,0,0,49,630,7.7,335,4.6,407]],
    ['leinsamen', 'Leinsamen', 'HN', 'g', 1, 5.0, [], [530,18,2,42,27,0,0,0,0,87,255,5.7,392,4.3,813]],
    ['kuerbiskerne', 'Kürbiskerne', 'HN', 'g', 1, 12.0, [], [560,30,11,49,6,2,1,0,0,58,46,8.8,592,7.8,809]],
    ['tahin', 'Tahin (Sesammus)', 'HN', 'g', 1, 12.0, ['sesam'], [595,17,21,54,9,0,1,0,0,98,426,6.4,95,4.6,414]],
    // Milch & Eier
    ['milch', 'Milch', 'MI', 'ml', 1, 1.1, ['milch'], [47,3.4,4.8,1.5,0,1,15,0.1,0.4,5,120,0,12,0.4,150]],
    ['hafermilch', 'Hafermilch (angereichert)', 'MI', 'ml', 1, 1.8, [], [45,1,7,1.5,0.8,0,0,0.75,0.38,3,120,0.1,10,0.1,100]],
    ['joghurt', 'Naturjoghurt', 'MI', 'g', 1, 2.0, ['milch'], [61,3.5,4.7,3.3,0,1,30,0,0.4,7,121,0.1,12,0.6,155]],
    ['skyr', 'Skyr', 'MI', 'g', 1, 3.5, ['milch'], [63,11,4,0.2,0,0,0,0,0.5,7,120,0.1,11,0.4,150]],
    ['quark', 'Magerquark', 'MI', 'g', 1, 2.6, ['milch'], [67,12,4,0.3,0,1,2,0,0.9,24,110,0.1,11,0.5,140]],
    ['feta', 'Feta', 'MI', 'g', 1, 9.0, ['milch'], [264,14,4,21,0,0,125,0.4,1.7,32,493,0.7,19,2.9,62]],
    ['mozzarella', 'Mozzarella', 'MI', 'g', 1, 7.0, ['milch'], [250,18,2,19,0,0,170,0.2,2,10,505,0.4,20,2.9,76]],
    ['parmesan', 'Parmesan', 'MI', 'g', 1, 22.0, ['milch'], [431,38,4,29,0,0,270,0.5,1.2,7,1184,0.8,44,2.8,92]],
    ['kaese', 'Gouda / Schnittkäse', 'MI', 'g', 1, 10.0, ['milch'], [356,25,2,28,0,0,260,0.5,1.5,20,740,0.3,30,3.9,91]],
    ['butter', 'Butter', 'MI', 'g', 1, 8.0, ['milch'], [717,0.9,0.1,81,0,0,684,1.5,0.2,3,24,0,2,0.1,24]],
    ['eier', 'Eier', 'MI', 'Stk', 55, 0.35, ['ei'], [143,12.6,0.7,9.5,0,0,160,2,0.9,47,56,1.8,12,1.3,138]],
    ['kokosmilch', 'Kokosmilch', 'KO', 'ml', 1, 3.0, [], [197,2,3,21,0,3,0,0,0,16,16,1.6,37,0.7,263]],
    // Fleisch & Fisch
    ['haehnchen', 'Hähnchenbrust', 'FF', 'g', 1, 10.0, ['fleisch'], [110,23,0,1.5,0,0,6,0.1,0.3,7,5,0.4,28,0.7,350]],
    ['rinderhack', 'Rinderhack', 'FF', 'g', 1, 11.0, ['fleisch'], [220,18,0,16,0,0,0,0.1,2.5,8,12,2.1,18,4.5,300]],
    ['schinken', 'Schinkenwürfel', 'FF', 'g', 1, 12.0, ['fleisch', 'schwein'], [140,20,1,6,0,0,0,0.6,0.6,2,8,0.8,20,1.8,350]],
    ['lachs', 'Lachsfilet', 'FF', 'g', 1, 20.0, ['fisch'], [200,20,0,13,0,0,50,11,3.2,26,12,0.3,27,0.4,360]],
    ['thunfisch', 'Thunfisch (Dose)', 'KO', 'g', 1, 12.0, ['fisch'], [110,25,0,1,0,0,10,4,3,5,10,1,30,0.8,250]],
    ['garnelen', 'Garnelen', 'FF', 'g', 1, 18.0, ['schalentier'], [85,18,0,1,0,0,0,0,1.5,3,64,0.5,37,1.3,185]],
    // Obst & Gemüse
    ['zwiebel', 'Zwiebel', 'OG', 'Stk', 80, 0.3, [], [40,1.1,9,0.1,1.7,7,0,0,0,19,23,0.2,10,0.2,146]],
    ['knoblauch', 'Knoblauchzehe', 'OG', 'Stk', 4, 0.1, [], [149,6.4,33,0.5,2.1,31,0,0,0,3,181,1.7,25,1.2,401]],
    ['tomaten', 'Tomaten', 'OG', 'g', 1, 3.5, [], [18,0.9,3.9,0.2,1.2,14,42,0,0,15,10,0.3,11,0.2,237]],
    ['dosentomaten', 'Dosentomaten (gehackt)', 'KO', 'g', 1, 1.6, [], [24,1.2,4,0.2,1.3,9,20,0,0,10,24,1,12,0.2,240]],
    ['tomatenmark', 'Tomatenmark', 'KO', 'g', 1, 4.0, [], [82,4.3,19,0.5,4,21,0,0,0,40,35,3,40,0.8,1000]],
    ['paprika', 'Paprika', 'OG', 'Stk', 160, 0.9, [], [31,1,6,0.3,2.1,128,157,0,0,46,7,0.4,12,0.3,211]],
    ['zucchini', 'Zucchini', 'OG', 'Stk', 250, 0.9, [], [17,1.2,3.1,0.3,1,17.9,10,0,0,24,16,0.4,18,0.3,261]],
    ['aubergine', 'Aubergine', 'OG', 'Stk', 300, 1.2, [], [25,1,6,0.2,3,2,1,0,0,22,9,0.2,14,0.2,230]],
    ['gurke', 'Gurke', 'OG', 'Stk', 350, 0.8, [], [15,0.7,3.6,0.1,0.5,2.8,5,0,0,7,16,0.3,13,0.2,147]],
    ['karotten', 'Karotten', 'OG', 'g', 1, 1.3, [], [41,0.9,9.6,0.2,2.8,6,835,0,0,19,33,0.3,12,0.2,320]],
    ['brokkoli', 'Brokkoli', 'OG', 'g', 1, 3.0, [], [34,2.8,7,0.4,2.6,89,31,0,0,63,47,0.7,21,0.4,316]],
    ['spinat', 'Spinat', 'OG', 'g', 1, 4.0, [], [23,2.9,3.6,0.4,2.2,28,469,0,0,194,99,2.7,79,0.5,558]],
    ['blumenkohl', 'Blumenkohl', 'OG', 'g', 1, 2.5, [], [25,1.9,5,0.3,2,48,0,0,0,57,22,0.4,15,0.3,299]],
    ['champignons', 'Champignons', 'OG', 'g', 1, 4.5, [], [22,3.1,3.3,0.3,1,2,0,0.2,0.04,17,3,0.5,9,0.5,318]],
    ['rucola', 'Rucola', 'OG', 'g', 1, 10.0, [], [25,2.6,3.7,0.7,1.6,15,119,0,0,97,160,1.5,47,0.5,369]],
    ['lauch', 'Lauch', 'OG', 'g', 1, 3.0, [], [31,1.8,7,0.3,2.6,12,83,0,0,64,59,2.1,28,1.1,180]],
    ['kuerbis', 'Kürbis (Hokkaido)', 'OG', 'g', 1, 2.5, [], [26,1,6,0.1,0.5,9,426,0,0,16,21,0.8,12,0.3,340]],
    ['mais', 'Mais (Dose)', 'KO', 'g', 1, 3.0, [], [80,2.5,15,1.2,2.4,5,10,0,0,40,3,0.5,26,0.5,200]],
    ['erbsen', 'Erbsen (TK)', 'OG', 'g', 1, 2.8, [], [80,5,14,0.4,5,40,38,0,0,60,25,1.5,33,1.2,244]],
    ['ingwer', 'Ingwer', 'OG', 'g', 1, 8.0, [], [80,1.8,18,0.8,2,5,0,0,0,11,16,0.6,43,0.3,415]],
    ['avocado', 'Avocado', 'OG', 'Stk', 150, 1.2, [], [160,2,9,15,7,10,7,0,0,81,12,0.6,29,0.6,485]],
    ['zitrone', 'Zitrone', 'OG', 'Stk', 80, 0.4, [], [29,1.1,9,0.3,2.8,53,1,0,0,11,26,0.6,8,0.1,138]],
    ['bananen', 'Banane', 'OG', 'Stk', 120, 0.25, [], [89,1.1,23,0.3,2.6,8.7,3,0,0,20,5,0.3,27,0.15,358]],
    ['aepfel', 'Apfel', 'OG', 'Stk', 180, 0.5, [], [52,0.3,14,0.2,2.4,4.6,3,0,0,3,6,0.1,5,0.04,107]],
    ['beeren', 'Beeren (TK-Mix)', 'OG', 'g', 1, 5.5, [], [45,0.8,10,0.4,3.5,25,3,0,0,15,15,0.7,10,0.2,150]],
    // Basics & Gewürze (Basiszutaten)
    ['olivenoel', 'Olivenöl', 'BA', 'ml', 1, 9.0, [], [810,0,0,92,0,0,0,0,0,0,1,0.6,0,0,1], true],
    ['salz', 'Salz', 'BA', 'g', 1, 0.8, [], [0,0,0,0,0,0,0,0,0,0,24,0.3,1,0,8], true],
    ['pfeffer', 'Pfeffer', 'BA', 'g', 1, 30.0, [], [251,10,64,3,25,0,27,0,0,10,443,10,171,1.2,1329], true],
    ['bruehe', 'Gemüsebrühe', 'BA', 'ml', 1, 1.0, [], [4,0.2,0.6,0.1,0,0,0,0,0,0,5,0,2,0,20], true],
    ['wasser', 'Wasser', 'BA', 'ml', 1, 0, [], [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], true],
    ['curry', 'Currypulver', 'BA', 'g', 1, 25.0, [], [325,14,58,14,53,1,2,0,0,10,478,19,255,4,1543], true],
    ['zimt', 'Zimt', 'BA', 'g', 1, 20.0, [], [247,4,81,1.2,53,4,15,0,0,6,1002,8,60,2,431], true],
    ['kraeuter', 'Kräuter (italienisch)', 'BA', 'g', 1, 30.0, [], [265,11,40,4,25,50,100,0,0,200,1500,40,270,3,1500], true],
    ['paprikapulver', 'Paprikapulver', 'BA', 'g', 1, 20.0, [], [282,14,54,13,35,0,2463,0,0,49,229,21,178,4,2280], true],
    ['sojasauce', 'Sojasauce', 'BA', 'ml', 1, 4.0, ['soja', 'gluten'], [60,6,5,0,0.8,0,0,0,0,14,20,2,40,0.5,200]],
    ['honig', 'Honig', 'BA', 'g', 1, 9.0, ['honig'], [304,0.3,82,0,0,0.5,0,0,0,2,6,0.4,2,0.2,52]],
  ];

  KA.ING = {};
  ING_RAW.forEach((r) => {
    KA.ING[r[0]] = {
      id: r[0], name: r[1], cat: r[2], unit: r[3], gpu: r[4], price: r[5],
      flags: r[6], n: r[7], staple: !!r[8],
    };
  });

  // Rezept: [id, Name, Mahlzeiten (f=Frühstück m=Mittag a=Abend s=Snack), Minuten, Schwierigkeit 1-3, Portionen, Zutaten, Schritte]
  const R = [];
  const add = (id, name, types, time, diff, s, i, st) => R.push({ id, name, types: types.split(''), time, diff, s, i, st });

  // ---------- Frühstück ----------
  add('overnight-oats', 'Overnight Oats mit Beeren', 'fs', 10, 1, 1,
    [['haferflocken',60],['joghurt',100],['milch',100],['beeren',80],['chia',10],['honig',10]],
    ['Haferflocken, Joghurt, Milch und Chiasamen in einem Glas verrühren.','Über Nacht (mind. 4 Std.) im Kühlschrank quellen lassen.','Mit Beeren und Honig toppen.']);
  add('oats-vegan', 'Vegane Bananen-Oats', 'fs', 10, 1, 1,
    [['haferflocken',60],['hafermilch',200],['bananen',1],['leinsamen',10],['zimt',1]],
    ['Haferflocken mit Hafermilch und Leinsamen verrühren, 10 Min. quellen lassen.','Banane in Scheiben schneiden und darauf verteilen.','Mit Zimt bestäuben.']);
  add('ruehrei-spinat', 'Rührei mit Spinat & Vollkornbrot', 'f', 12, 1, 1,
    [['eier',3],['spinat',80],['butter',10],['vollkornbrot',80]],
    ['Spinat in Butter zusammenfallen lassen.','Eier verquirlen, dazugeben und stocken lassen.','Mit Salz & Pfeffer würzen und mit Brot servieren.']);
  add('skyr-bowl', 'Skyr-Bowl mit Banane & Walnüssen', 'fs', 5, 1, 1,
    [['skyr',200],['bananen',1],['walnuesse',20],['honig',10],['haferflocken',20]],
    ['Skyr in eine Schüssel geben.','Banane schneiden, Walnüsse grob hacken.','Alles mit Haferflocken und Honig toppen.']);
  add('porridge-apfel', 'Porridge mit Apfel & Zimt', 'f', 10, 1, 1,
    [['haferflocken',60],['milch',250],['aepfel',1],['zimt',2],['mandeln',10]],
    ['Haferflocken mit Milch unter Rühren 5 Min. köcheln.','Apfel raspeln und unterrühren.','Mit Zimt und gehackten Mandeln servieren.']);
  add('avocado-toast', 'Avocado-Toast mit Ei', 'f', 10, 1, 1,
    [['vollkornbrot',80],['avocado',0.5],['eier',1],['tomaten',50]],
    ['Brot toasten und Avocado darauf zerdrücken.','Ei 6 Min. kochen oder braten.','Mit Tomatenscheiben, Salz und Pfeffer belegen.']);
  add('tofu-ruehrei', 'Tofu-Rührei (vegan)', 'fm', 15, 2, 1,
    [['tofu',150],['zwiebel',0.5],['paprika',0.5],['curry',1],['vollkornbrot',80],['olivenoel',5]],
    ['Zwiebel und Paprika in Öl anbraten.','Tofu zerbröseln, mit Curry zugeben und 5 Min. braten.','Mit Brot servieren.']);
  add('protein-pancakes', 'Protein-Pancakes mit Beeren', 'f', 20, 2, 1,
    [['haferflocken',60],['eier',2],['bananen',1],['quark',100],['butter',5],['beeren',50]],
    ['Haferflocken, Eier, Banane und Quark pürieren.','In Butter portionsweise zu Pancakes ausbacken.','Mit Beeren servieren.']);
  add('quark-beeren', 'Quark mit Leinsamen & Beeren', 'fs', 5, 1, 1,
    [['quark',250],['beeren',100],['leinsamen',15],['honig',10]],
    ['Quark glatt rühren.','Beeren und Leinsamen daraufgeben.','Mit Honig beträufeln.']);
  add('chia-pudding', 'Kokos-Chia-Pudding', 'fs', 5, 1, 2,
    [['chia',40],['kokosmilch',200],['hafermilch',100],['beeren',100]],
    ['Chiasamen mit Kokosmilch und Hafermilch verrühren.','Mind. 2 Std. (besser über Nacht) quellen lassen, zwischendurch umrühren.','Mit Beeren servieren.']);
  add('shakshuka', 'Shakshuka mit Brot', 'fma', 30, 2, 2,
    [['eier',4],['dosentomaten',400],['paprika',1],['zwiebel',1],['knoblauch',2],['paprikapulver',2],['olivenoel',10],['vollkornbrot',100],['feta',50]],
    ['Zwiebel, Paprika und Knoblauch in Öl anbraten, Paprikapulver zugeben.','Tomaten dazu und 10 Min. einkochen.','Mulden formen, Eier hineinschlagen, zugedeckt stocken lassen.','Mit Feta bestreuen, Brot dazu reichen.']);

  // ---------- Mittag / Abend ----------
  add('spaghetti-pomodoro', 'Spaghetti Pomodoro', 'ma', 25, 1, 2,
    [['nudeln',200],['dosentomaten',400],['zwiebel',1],['knoblauch',2],['olivenoel',15],['parmesan',20],['kraeuter',1]],
    ['Zwiebel und Knoblauch in Öl glasig dünsten.','Tomaten und Kräuter zugeben, 15 Min. köcheln.','Nudeln al dente kochen, mit Sauce mischen, Parmesan darüber.']);
  add('pasta-haehnchen-brokkoli', 'Vollkornpasta mit Hähnchen & Brokkoli', 'ma', 30, 2, 2,
    [['vollkornnudeln',200],['haehnchen',250],['brokkoli',300],['knoblauch',2],['olivenoel',15],['parmesan',20],['zitrone',0.5]],
    ['Nudeln kochen, Brokkoli in den letzten 4 Min. mitgaren.','Hähnchen würfeln und mit Knoblauch in Öl goldbraun braten.','Alles mischen, mit Zitronensaft und Parmesan abschmecken.']);
  add('rote-linsen-dal', 'Rotes Linsen-Dal mit Reis', 'ma', 35, 1, 3,
    [['linsen',150],['reis',150],['kokosmilch',200],['zwiebel',1],['knoblauch',2],['ingwer',10],['curry',3],['dosentomaten',200],['spinat',100],['olivenoel',10]],
    ['Zwiebel, Knoblauch und Ingwer in Öl andünsten, Curry kurz mitrösten.','Linsen, Tomaten, Kokosmilch und 300 ml Wasser zugeben, 15 Min. köcheln.','Spinat unterheben. Reis separat kochen und dazu servieren.']);
  add('gemuese-curry', 'Gemüse-Curry mit Kichererbsen', 'ma', 35, 2, 2,
    [['kichererbsen',240],['kokosmilch',200],['paprika',1],['zucchini',1],['zwiebel',1],['knoblauch',2],['ingwer',10],['curry',3],['reis',150],['spinat',60]],
    ['Reis nach Packungsanleitung kochen.','Zwiebel, Knoblauch, Ingwer anbraten, Gemüse zugeben und Curry einrühren.','Kichererbsen und Kokosmilch zufügen, 12 Min. köcheln, Spinat unterheben.']);
  add('haehnchen-reis-pfanne', 'Hähnchen-Reis-Pfanne', 'ma', 30, 1, 2,
    [['haehnchen',300],['reis',150],['paprika',2],['zwiebel',1],['erbsen',100],['sojasauce',20],['olivenoel',10],['knoblauch',2]],
    ['Reis kochen.','Hähnchen in Streifen in Öl anbraten, Zwiebel, Knoblauch und Paprika zugeben.','Erbsen, Reis und Sojasauce unterrühren und 3 Min. durchbraten.']);
  add('lachs-ofenkartoffeln', 'Lachs mit Ofenkartoffeln & Brokkoli', 'a', 40, 2, 2,
    [['lachs',300],['kartoffeln',500],['brokkoli',300],['olivenoel',20],['zitrone',1],['kraeuter',1]],
    ['Kartoffeln in Spalten mit Öl und Kräutern bei 200 °C 25 Min. backen.','Lachs und Brokkoli dazugeben, weitere 12 Min. garen.','Mit Zitrone beträufeln.']);
  add('chili-sin-carne', 'Chili sin Carne', 'ma', 35, 1, 3,
    [['kidneybohnen',400],['mais',150],['dosentomaten',400],['paprika',1],['zwiebel',1],['knoblauch',2],['reis',150],['tomatenmark',20],['paprikapulver',2],['olivenoel',10]],
    ['Zwiebel, Knoblauch und Paprika in Öl anbraten, Tomatenmark kurz mitrösten.','Tomaten, Bohnen, Mais und Paprikapulver zugeben, 20 Min. köcheln.','Mit Reis servieren.']);
  add('chili-con-carne', 'Chili con Carne', 'ma', 40, 2, 3,
    [['rinderhack',300],['kidneybohnen',250],['dosentomaten',400],['zwiebel',1],['mais',100],['paprika',1],['knoblauch',2],['reis',150],['tomatenmark',20]],
    ['Hack in einem Topf krümelig anbraten, Zwiebel und Knoblauch zugeben.','Tomatenmark, Paprika, Tomaten, Bohnen und Mais zufügen, 25 Min. schmoren.','Mit Reis servieren.']);
  add('tofu-pfanne', 'Asiatische Tofu-Gemüse-Pfanne', 'ma', 30, 2, 2,
    [['tofu',250],['reis',150],['brokkoli',200],['karotten',150],['paprika',1],['sojasauce',30],['ingwer',10],['knoblauch',2],['erdnussmus',20],['olivenoel',10]],
    ['Reis kochen. Tofu würfeln und in Öl knusprig braten.','Gemüse, Ingwer und Knoblauch zugeben und 6 Min. braten.','Sojasauce mit Erdnussmus und etwas Wasser glatt rühren, untermischen.']);
  add('gemuese-omelett', 'Gemüse-Omelett mit Feta', 'fma', 20, 1, 2,
    [['eier',4],['paprika',1],['champignons',150],['zwiebel',1],['feta',50],['olivenoel',10]],
    ['Zwiebel, Paprika und Pilze in Öl anbraten.','Eier verquirlen, darübergießen und stocken lassen.','Feta darüber krümeln und zusammenklappen.']);
  add('griechischer-quinoa', 'Griechischer Quinoa-Salat', 'ma', 25, 1, 2,
    [['quinoa',120],['gurke',0.7],['tomaten',250],['feta',120],['zwiebel',1],['olivenoel',20],['zitrone',0.5]],
    ['Quinoa nach Anleitung kochen und abkühlen lassen.','Gemüse würfeln, Feta zerbröseln.','Alles mit Öl, Zitronensaft, Salz und Pfeffer vermengen.']);
  add('quinoa-suesskartoffel', 'Quinoa-Bowl mit Süßkartoffel & Kichererbsen', 'ma', 40, 2, 2,
    [['quinoa',120],['suesskartoffel',400],['kichererbsen',240],['spinat',80],['tahin',20],['zitrone',0.5],['olivenoel',10]],
    ['Süßkartoffelwürfel mit Öl bei 200 °C 25 Min. rösten, Kichererbsen die letzten 10 Min. mitrösten.','Quinoa kochen.','Bowl mit Spinat anrichten, Tahin mit Zitronensaft und Wasser zur Sauce verrühren.']);
  add('kartoffelsuppe', 'Cremige Kartoffelsuppe', 'ma', 40, 1, 3,
    [['kartoffeln',600],['karotten',200],['lauch',150],['zwiebel',1],['bruehe',800],['butter',10],['kraeuter',1]],
    ['Zwiebel in Butter andünsten, Gemüse in Stücken zugeben.','Mit Brühe aufgießen, 20 Min. weich kochen.','Teilweise pürieren und würzen.']);
  add('kuerbissuppe', 'Kürbis-Kokos-Suppe', 'ma', 40, 1, 3,
    [['kuerbis',800],['kartoffeln',200],['zwiebel',1],['ingwer',10],['kokosmilch',200],['bruehe',500],['kuerbiskerne',20],['olivenoel',10]],
    ['Zwiebel und Ingwer in Öl andünsten, Kürbis und Kartoffeln zugeben.','Mit Brühe 20 Min. garen, Kokosmilch zugeben und pürieren.','Mit Kürbiskernen toppen.']);
  add('ofenpasta-mozzarella', 'Tomaten-Mozzarella-Ofenpasta', 'ma', 35, 1, 2,
    [['nudeln',250],['tomaten',400],['mozzarella',125],['knoblauch',2],['olivenoel',20],['kraeuter',1]],
    ['Tomaten und Knoblauch mit Öl und Kräutern 20 Min. bei 200 °C backen.','Nudeln kochen und mit der Tomatensauce mischen.','Mozzarella darauf zupfen und kurz überbacken.']);
  add('gemuese-lasagne', 'Gemüse-Lasagne', 'a', 75, 3, 4,
    [['nudeln',250],['zucchini',2],['aubergine',1],['dosentomaten',400],['mozzarella',125],['parmesan',30],['zwiebel',1],['knoblauch',2],['milch',300],['butter',30],['mehl',30]],
    ['Gemüse in Scheiben anbraten, mit Zwiebel, Knoblauch und Tomaten zur Sauce kochen.','Béchamel: Butter und Mehl anschwitzen, Milch einrühren und eindicken.','Schichten (Sauce, Platten, Béchamel), mit Käse bestreuen, 35 Min. bei 190 °C backen.']);
  add('gnocchi-spinat', 'Selbstgemachte Gnocchi mit Spinat-Feta-Sauce', 'a', 70, 3, 3,
    [['kartoffeln',600],['mehl',150],['eier',1],['spinat',150],['feta',100],['knoblauch',2],['olivenoel',10],['parmesan',20]],
    ['Kartoffeln kochen, pellen, pressen und mit Mehl und Ei zu Teig verkneten.','Rollen formen, in Stücke schneiden und in Salzwasser garziehen lassen.','Spinat mit Knoblauch anbraten, Feta unterrühren, Gnocchi darin schwenken.']);
  add('spinat-feta-wraps', 'Spinat-Feta-Wraps', 'ma', 20, 1, 2,
    [['tortilla',4],['spinat',150],['feta',100],['tomaten',150],['zwiebel',1],['olivenoel',10],['joghurt',100]],
    ['Zwiebel und Spinat in Öl zusammenfallen lassen.','Tortillas mit Joghurt bestreichen, Spinat, Tomaten und Feta darauf verteilen.','Einrollen und kurz anbraten.']);
  add('haehnchen-wraps', 'Hähnchen-Wraps mit Gemüse', 'ma', 25, 1, 2,
    [['tortilla',4],['haehnchen',250],['paprika',1],['gurke',0.4],['joghurt',100],['rucola',40],['zwiebel',1],['olivenoel',10]],
    ['Hähnchenstreifen in Öl anbraten, würzen.','Tortillas mit Joghurt bestreichen und mit Gemüse und Rucola belegen.','Hähnchen darauflegen und einrollen.']);
  add('thunfisch-pasta', 'Thunfisch-Tomaten-Pasta', 'ma', 25, 1, 2,
    [['nudeln',200],['thunfisch',200],['dosentomaten',400],['zwiebel',1],['knoblauch',2],['erbsen',100],['olivenoel',10]],
    ['Zwiebel und Knoblauch andünsten, Tomaten zugeben und 10 Min. köcheln.','Thunfisch und Erbsen unterrühren.','Mit gekochten Nudeln mischen.']);
  add('garnelen-reis', 'Knoblauch-Garnelen mit Zitronenreis', 'a', 25, 2, 2,
    [['garnelen',250],['reis',150],['zucchini',1],['knoblauch',3],['zitrone',1],['olivenoel',15],['ingwer',5]],
    ['Reis kochen und mit Zitronenabrieb mischen.','Garnelen mit Knoblauch und Ingwer in Öl 3 Min. braten.','Zucchini-Scheiben mitbraten, mit Zitronensaft ablöschen.']);
  add('hack-kartoffel-auflauf', 'Kartoffel-Hack-Auflauf', 'a', 60, 2, 3,
    [['kartoffeln',700],['rinderhack',300],['zwiebel',1],['dosentomaten',200],['kaese',100],['milch',150],['kraeuter',1]],
    ['Kartoffeln in Scheiben vorkochen.','Hack mit Zwiebel und Tomaten anbraten.','Schichten, Milch darübergießen, Käse darauf, 30 Min. bei 200 °C backen.']);
  add('spinat-kichererbsen-eintopf', 'Spinat-Kichererbsen-Eintopf', 'ma', 35, 1, 3,
    [['kichererbsen',480],['spinat',200],['kartoffeln',300],['zwiebel',1],['knoblauch',3],['dosentomaten',400],['paprikapulver',2],['bruehe',300],['olivenoel',10]],
    ['Zwiebel und Knoblauch in Öl andünsten, Paprikapulver zugeben.','Kartoffelwürfel, Tomaten und Brühe zugeben, 15 Min. köcheln.','Kichererbsen und Spinat einrühren und 5 Min. ziehen lassen.']);
  add('linsen-bolognese', 'Linsen-Bolognese', 'ma', 35, 1, 3,
    [['linsen',200],['nudeln',250],['dosentomaten',400],['karotten',150],['zwiebel',1],['knoblauch',2],['tomatenmark',20],['olivenoel',10],['bruehe',400]],
    ['Zwiebel, Karotte, Knoblauch in Öl anbraten, Tomatenmark mitrösten.','Linsen, Tomaten und Brühe zugeben und 20 Min. köcheln.','Mit Nudeln servieren.']);
  add('blumenkohl-curry', 'Blumenkohl-Kartoffel-Curry', 'ma', 40, 1, 3,
    [['blumenkohl',500],['kartoffeln',300],['erbsen',100],['kokosmilch',200],['zwiebel',1],['ingwer',10],['curry',3],['dosentomaten',200]],
    ['Zwiebel und Ingwer anbraten, Curry zugeben.','Kartoffeln, Blumenkohl, Tomaten, Kokosmilch zugeben, 20 Min. garen.','Erbsen die letzten 5 Min. mitgaren.']);
  add('gefuellte-paprika-hack', 'Gefüllte Paprika mit Hack & Reis', 'a', 60, 2, 2,
    [['paprika',4],['rinderhack',250],['reis',100],['zwiebel',1],['dosentomaten',400],['kaese',80],['knoblauch',2]],
    ['Reis vorkochen, Hack mit Zwiebel und Knoblauch anbraten und mit dem Reis mischen.','Paprika aushöhlen, füllen und in eine Form mit Tomaten setzen.','Käse darüber, 35 Min. bei 190 °C backen.']);
  add('gefuellte-paprika-veg', 'Gefüllte Paprika mit Quinoa & Feta', 'a', 55, 2, 2,
    [['paprika',4],['quinoa',100],['feta',100],['mais',100],['dosentomaten',200],['zwiebel',1],['knoblauch',2]],
    ['Quinoa kochen und mit Mais, Zwiebel, Knoblauch und zerbröseltem Feta mischen.','Paprika füllen, in eine Form mit Tomaten setzen.','35 Min. bei 190 °C backen.']);
  add('pilz-risotto', 'Pilz-Risotto', 'a', 40, 3, 2,
    [['reis',200],['champignons',300],['zwiebel',1],['knoblauch',2],['bruehe',800],['parmesan',40],['butter',20],['olivenoel',10]],
    ['Pilze in Butter kräftig anbraten und beiseitestellen.','Zwiebel, Knoblauch und Reis in Öl anschwitzen, Brühe kellenweise zugeben und rühren.','Nach ca. 20 Min. Pilze und Parmesan unterheben.']);
  add('ofengemuese-couscous', 'Ofengemüse mit Couscous & Tahin', 'ma', 35, 1, 2,
    [['couscous',150],['paprika',1],['zucchini',1],['aubergine',1],['karotten',150],['kichererbsen',240],['olivenoel',20],['tahin',20],['zitrone',0.5]],
    ['Gemüse und Kichererbsen mit Öl bei 200 °C 25 Min. rösten.','Couscous mit heißem Wasser quellen lassen.','Mit Tahin-Zitronen-Sauce servieren.']);
  add('suesskartoffel-burrito', 'Süßkartoffel-Bohnen-Burritos', 'ma', 40, 2, 2,
    [['tortilla',4],['suesskartoffel',300],['kidneybohnen',240],['mais',100],['avocado',1],['paprika',1],['zwiebel',1]],
    ['Süßkartoffelwürfel im Ofen rösten (25 Min.).','Zwiebel, Paprika, Bohnen und Mais anbraten.','Tortillas füllen, mit Avocado servieren.']);
  add('lachs-quinoa-bowl', 'Lachs-Quinoa-Bowl', 'ma', 30, 2, 2,
    [['lachs',250],['quinoa',120],['avocado',1],['gurke',0.4],['sojasauce',20],['spinat',60],['ingwer',5]],
    ['Quinoa kochen. Lachs in Würfeln mit Ingwer und Sojasauce braten.','Gurke und Avocado schneiden.','Alles in Schalen anrichten.']);
  add('haehnchen-gemuesesuppe', 'Hähnchen-Gemüse-Suppe', 'ma', 40, 1, 3,
    [['haehnchen',250],['karotten',200],['lauch',150],['kartoffeln',300],['bruehe',1000],['nudeln',80],['zwiebel',1]],
    ['Zwiebel andünsten, Gemüse und Brühe zugeben, 15 Min. köcheln.','Hähnchen würfeln, Nudeln zufügen und weitere 10 Min. garen.','Abschmecken.']);
  add('bratkartoffeln-ei', 'Bratkartoffeln mit Spiegelei & Schinken', 'a', 35, 1, 2,
    [['kartoffeln',600],['eier',4],['zwiebel',1],['schinken',80],['butter',20],['spinat',100]],
    ['Kartoffeln vorkochen, in Scheiben in Butter knusprig braten.','Zwiebel, Schinken zugeben, Spinat unterheben.','Spiegeleier braten und darauf servieren.']);

  // ---------- Snacks ----------
  add('gemuesesticks-dip', 'Gemüsesticks mit Kichererbsen-Dip', 's', 10, 1, 2,
    [['karotten',200],['gurke',0.4],['kichererbsen',240],['tahin',20],['zitrone',0.5],['olivenoel',10],['knoblauch',1]],
    ['Kichererbsen mit Tahin, Zitronensaft, Öl und Knoblauch pürieren.','Gemüse in Sticks schneiden und dippen.']);
  add('joghurt-nuesse', 'Joghurt mit Nüssen & Honig', 's', 5, 1, 1,
    [['joghurt',150],['walnuesse',20],['honig',10],['beeren',50]],
    ['Joghurt in ein Schälchen geben, mit Nüssen, Beeren und Honig toppen.']);
  add('apfel-erdnussmus', 'Apfelspalten mit Erdnussmus', 's', 3, 1, 1,
    [['aepfel',1],['erdnussmus',20]],
    ['Apfel in Spalten schneiden und mit Erdnussmus servieren.']);
  add('quark-dip', 'Quark-Gurken-Dip mit Vollkornbrot', 's', 10, 1, 1,
    [['quark',150],['gurke',0.3],['vollkornbrot',60],['kraeuter',1]],
    ['Gurke raspeln, mit Quark und Kräutern verrühren.','Mit Brot servieren.']);
  add('hafer-kekse', 'Banane-Hafer-Kekse', 's', 25, 1, 4,
    [['haferflocken',100],['bananen',2],['mandeln',20],['zimt',1]],
    ['Bananen zerdrücken und mit Haferflocken, gehackten Mandeln und Zimt mischen.','Kleine Häufchen auf ein Blech setzen, 15 Min. bei 180 °C backen.']);
  add('gruener-smoothie', 'Grüner Beeren-Smoothie', 's', 5, 1, 1,
    [['bananen',1],['spinat',50],['hafermilch',250],['beeren',80],['leinsamen',10]],
    ['Alle Zutaten im Mixer cremig pürieren.']);

  KA.RECIPES = R;
  KA.MEALS = {
    f: { label: 'Frühstück', w: 0.25 },
    m: { label: 'Mittagessen', w: 0.35 },
    a: { label: 'Abendessen', w: 0.30 },
    s: { label: 'Snack', w: 0.10 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
