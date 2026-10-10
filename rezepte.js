/* Kochapp – Rezeptbuch: zusätzliche Rezepte für alle Kategorien
 * Diese Rezepte erscheinen im Rezeptbuch und auf der Einkaufsliste (wie eigene Rezepte),
 * nicht im Vorrats-Finder oder Wochenplan – dafür fehlen ihnen die Nährwerte.
 * Format: r(id, Titel, Minuten, Portionen, Bild, 'Zutat|Zutat|…', 'Schritt|Schritt|…')
 * Bild: 'art:farbe1,farbe2,farbe3' (siehe bilder.js).
 */
(function (root) {
  const KA = (root.KA = root.KA || {});

  KA.BOOK_CATS = ['Frühstück', 'Hauptgericht', 'Snack', 'Backen', 'Nachtisch', 'Getränke'];
  KA.KUECHEN = ['Italienisch', 'Deutsch', 'Mexikanisch', 'Indisch', 'Asiatisch', 'Griechisch', 'Orientalisch', 'Französisch', 'Spanisch', 'Amerikanisch', 'International'];

  // Mitgelieferte Rezepte aus data.js: Küche (bei Hauptgerichten), Bild und ggf. abweichende Kategorie
  KA.BUILTIN_META = {
    'overnight-oats': { img: 'dessert:joghurt,vanille,beere' },
    'oats-vegan': { img: 'suppe:creme,banane,zimt' },
    'ruehrei-spinat': { img: 'teller:eigelb,brot,spinat' },
    'skyr-bowl': { img: 'suppe:joghurt,banane,nuss' },
    'porridge-apfel': { img: 'suppe:creme,apfel,zimt' },
    'avocado-toast': { img: 'toast:avocado,tomate,ei' },
    'protein-pancakes': { img: 'pancakes:teig,honig,beere' },
    'quark-beeren': { img: 'suppe:joghurt,beere,nuss' },
    'chia-pudding': { img: 'dessert:kokos,sahne,beere' },
    'tofu-ruehrei': { k: 'International', img: 'teller:mais,brot,paprika' },
    shakshuka: { k: 'Orientalisch', img: 'ei:tomate,kraut' },
    'spaghetti-pomodoro': { k: 'Italienisch', img: 'pasta:nudel,tomate,kraut' },
    'pasta-haehnchen-brokkoli': { k: 'Italienisch', img: 'pasta:nudel,haehnchen,kraut' },
    'rote-linsen-dal': { k: 'Indisch', img: 'curry:linse,reis,kraut' },
    'gemuese-curry': { k: 'Indisch', img: 'curry:curry,paprika,spinat' },
    'haehnchen-reis-pfanne': { k: 'Asiatisch', img: 'teller:reis,paprika,haehnchen' },
    'lachs-ofenkartoffeln': { k: 'International', img: 'teller:lachs,kartoffel,kraut' },
    'chili-sin-carne': { k: 'Mexikanisch', img: 'eintopf:tomate,bohne,mais' },
    'chili-con-carne': { k: 'Mexikanisch', img: 'eintopf:sosse,bohne,mais' },
    'tofu-pfanne': { k: 'Asiatisch', img: 'bowl:reis,karotte,kraut' },
    'gemuese-omelett': { k: 'International', img: 'gefaltet:eigelb,paprika,kraut' },
    'griechischer-quinoa': { k: 'Griechisch', img: 'salat:tomate,ei,oliv' },
    'quinoa-suesskartoffel': { k: 'International', img: 'bowl:kuerbis,spinat,kichererbse' },
    kartoffelsuppe: { k: 'Deutsch', img: 'suppe:kartoffel,karotte,kraut' },
    kuerbissuppe: { k: 'International', img: 'suppe:kuerbis,kokos,kraut' },
    'ofenpasta-mozzarella': { k: 'Italienisch', img: 'auflauf:tomate,ei,kraut' },
    'gemuese-lasagne': { k: 'Italienisch', img: 'auflauf:tomate,kaese,kraut' },
    'gnocchi-spinat': { k: 'Italienisch', img: 'teller:kartoffel,spinat,ei' },
    'spinat-feta-wraps': { k: 'Griechisch', img: 'wrap:spinat,ei,tomate' },
    'haehnchen-wraps': { k: 'International', img: 'wrap:haehnchen,paprika,gurke' },
    'thunfisch-pasta': { k: 'Italienisch', img: 'pasta:nudel,tomate,fisch' },
    'garnelen-reis': { k: 'Spanisch', img: 'teller:reis,garnele,zitrone' },
    'hack-kartoffel-auflauf': { k: 'Deutsch', img: 'auflauf:kaese,kruste,kraut' },
    'spinat-kichererbsen-eintopf': { k: 'Spanisch', img: 'eintopf:tomate,kartoffel,spinat' },
    'linsen-bolognese': { k: 'Italienisch', img: 'pasta:nudel,sosse,kraut' },
    'blumenkohl-curry': { k: 'Indisch', img: 'curry:curry,ei,kraut' },
    'gefuellte-paprika-hack': { k: 'Deutsch', img: 'teller:paprika,reis,kaese' },
    'gefuellte-paprika-veg': { k: 'International', img: 'teller:paprika,mais,ei' },
    'pilz-risotto': { k: 'Italienisch', img: 'teller:creme,pilz,kraut' },
    'ofengemuese-couscous': { k: 'Orientalisch', img: 'bowl:nudel,aubergine,paprika' },
    'suesskartoffel-burrito': { k: 'Mexikanisch', img: 'wrap:kuerbis,bohne,avocado' },
    'lachs-quinoa-bowl': { k: 'Asiatisch', img: 'bowl:lachs,avocado,gurke' },
    'haehnchen-gemuesesuppe': { k: 'Deutsch', img: 'suppe:bruehe,karotte,kraut' },
    'bratkartoffeln-ei': { k: 'Deutsch', img: 'ei:kartoffel,kraut' },
    'gemuesesticks-dip': { img: 'dip:creme,karotte,kraut' },
    'joghurt-nuesse': { img: 'suppe:joghurt,nuss,beere' },
    'apfel-erdnussmus': { img: 'dip:nuss,apfel,nuss' },
    'quark-dip': { img: 'dip:joghurt,brot,gurke' },
    'hafer-kekse': { img: 'kekse:teig,nuss' },
    'gruener-smoothie': { cat: 'Getränke', img: 'glas:matcha,keine,limette' },
  };

  const B = (KA.BOOK = []);
  let kat = '', kueche = '';
  const r = (id, title, time, serv, img, ings, steps) =>
    B.push({ id: 'b-' + id, title, cat: kat, cuisine: kat === 'Hauptgericht' ? kueche : '', time, serv, img, ings: ings.split('|'), steps: steps.split('|') });

  /* ==================== Frühstück ==================== */
  kat = 'Frühstück';
  r('pancakes', 'Amerikanische Pancakes', 25, 4, 'pancakes:teig,honig,blaubeere',
    '250 g Weizenmehl|2 EL Zucker|1 Pck Backpulver|1 Prise Salz|2 Eier|300 ml Milch|40 g Butter|4 EL Ahornsirup|150 g Blaubeeren',
    'Mehl, Zucker, Backpulver und Salz mischen.|Eier, Milch und geschmolzene Butter verquirlen und kurz unter die Mehlmischung rühren.|Kleine Pancakes in einer gefetteten Pfanne von beiden Seiten goldbraun backen.|Mit Ahornsirup und Blaubeeren stapeln.');
  r('french-toast', 'French Toast mit Beeren', 20, 2, 'toast:teig,beere,zucker',
    '4 Stk Toastbrot|2 Eier|100 ml Milch|1 TL Zimt|1 EL Zucker|20 g Butter|150 g Beeren (TK-Mix)|1 EL Puderzucker',
    'Eier, Milch, Zimt und Zucker verquirlen.|Brotscheiben kurz darin einweichen.|In Butter von jeder Seite 2–3 Minuten goldbraun braten.|Mit Beeren und Puderzucker servieren.');
  r('bircher-muesli', 'Bircher-Müsli', 10, 2, 'suppe:creme,gruenapfel,nuss',
    '100 g Haferflocken|150 ml Milch|150 g Naturjoghurt|1 Apfel|1 EL Zitronensaft|1 EL Honig|30 g Haselnüsse',
    'Haferflocken mit Milch und Joghurt verrühren und über Nacht quellen lassen.|Apfel grob raspeln und mit Zitronensaft mischen.|Apfel und Honig unterrühren, mit gehackten Haselnüssen bestreuen.');
  r('granola', 'Knuspriges Honig-Granola', 35, 8, 'suppe:joghurt,teig,beere',
    '300 g Haferflocken|100 g Mandeln|50 g Kürbiskerne|80 g Honig|3 EL Kokosöl|1 TL Zimt|1 Prise Salz|80 g Rosinen',
    'Ofen auf 160 °C vorheizen.|Honig und Kokosöl erwärmen, mit Haferflocken, gehackten Mandeln, Kernen, Zimt und Salz mischen.|Auf einem Blech 20–25 Minuten rösten, dabei zweimal wenden.|Abkühlen lassen, Rosinen untermischen und luftdicht aufbewahren.');
  r('eggs-benedict', 'Eggs Benedict', 30, 2, 'ei:speck,kraut',
    '2 Stk English Muffins|4 Eier|4 Stk Kochschinken (Scheiben)|2 Eigelb|100 g Butter|1 EL Zitronensaft|1 EL Essig|Salz, Pfeffer',
    'Für die Hollandaise Eigelb mit Zitronensaft über dem Wasserbad aufschlagen, geschmolzene Butter langsam einrühren.|Wasser mit Essig zum Sieden bringen, Eier nacheinander hineingleiten lassen und 3–4 Minuten pochieren.|Muffins halbieren und toasten, mit Schinken belegen.|Pochierte Eier daraufsetzen und mit Hollandaise überziehen.');
  r('huevos-rancheros', 'Huevos Rancheros', 25, 2, 'ei:bohne,kraut',
    '4 Stk Weizen-Tortilla|4 Eier|200 g Kidneybohnen (Dose)|200 g Dosentomaten (gehackt)|1 Zwiebel|1 Stk Chilischote|1 Avocado|0.5 Bund Koriander|1 EL Olivenöl',
    'Zwiebel und Chili würfeln und in Öl andünsten, Tomaten zugeben und 8 Minuten einkochen.|Bohnen unterrühren und erwärmen.|Spiegeleier braten, Tortillas kurz in der Pfanne erwärmen.|Tortillas mit Bohnen-Salsa und Ei belegen, mit Avocado und Koriander servieren.');
  r('fruehstuecks-burrito', 'Frühstücks-Burrito', 20, 2, 'wrap:eigelb,speck,avocado',
    '2 Stk Weizen-Tortilla|4 Eier|80 g Bacon|1 Paprika|50 g Gouda / Schnittkäse|2 EL Salsa|Salz, Pfeffer',
    'Bacon knusprig braten, Paprika würfeln und kurz mitbraten.|Eier verquirlen und als Rührei stocken lassen.|Tortillas mit Rührei, Bacon, Paprika, Käse und Salsa füllen.|Fest einrollen und in der Pfanne kurz anrösten.');
  r('bauernfruehstueck', 'Bauernfrühstück', 30, 2, 'gefaltet:kartoffel,speck,kraut',
    '500 g Kartoffeln|4 Eier|100 g Schinkenwürfel|1 Zwiebel|20 g Butter|2 Stk Gewürzgurken|0.5 Bund Schnittlauch|Salz, Pfeffer',
    'Gekochte Kartoffeln in Scheiben schneiden und in Butter knusprig braten.|Zwiebel und Schinkenwürfel zugeben und mitbraten.|Eier verquirlen, würzen, darübergießen und bei mittlerer Hitze stocken lassen.|Mit Schnittlauch bestreuen, Gewürzgurken dazu reichen.');
  r('strammer-max', 'Strammer Max', 15, 2, 'toast:speck,ei,kraut',
    '4 Stk Bauernbrot (Scheiben)|4 Stk Kochschinken (Scheiben)|4 Eier|20 g Butter|1 Tomaten|0.5 Bund Schnittlauch',
    'Brot mit Butter bestreichen und mit Schinken belegen.|Spiegeleier braten und auf die Brote setzen.|Mit Tomatenscheiben und Schnittlauch garnieren.');
  r('smoothie-bowl', 'Beeren-Smoothie-Bowl', 10, 2, 'bowl:beere,banane,kokos',
    '300 g Beeren (TK-Mix)|2 Banane|150 g Naturjoghurt|50 ml Milch|30 g Granola|1 EL Kokosraspeln|1 EL Chiasamen',
    'Gefrorene Beeren, eine Banane, Joghurt und Milch zu einer dicken Creme mixen.|In zwei Schalen füllen.|Mit Bananenscheiben, Granola, Kokos und Chiasamen toppen.');
  r('waffeln', 'Belgische Waffeln', 30, 4, 'stuecke:teig,sahne,erdbeere',
    '250 g Weizenmehl|125 g Butter|80 g Zucker|1 Pck Vanillezucker|3 Eier|250 ml Milch|1 TL Backpulver|250 g Erdbeeren|1 EL Puderzucker',
    'Butter mit Zucker und Vanillezucker schaumig rühren, Eier einzeln unterrühren.|Mehl, Backpulver und Milch abwechselnd unterrühren.|Im vorgeheizten Waffeleisen portionsweise goldbraun backen.|Mit Erdbeeren und Puderzucker servieren.');
  r('griessbrei', 'Grießbrei mit Kirschen', 15, 2, 'suppe:vanille,kirsche,zimt',
    '500 ml Milch|60 g Weichweizengrieß|2 EL Zucker|1 Pck Vanillezucker|1 Prise Salz|200 g Sauerkirschen (Glas)|1 TL Zimt',
    'Milch mit Zucker, Vanillezucker und Salz aufkochen.|Grieß einrieseln lassen und unter Rühren 3 Minuten quellen lassen.|Kirschen erwärmen und auf dem Grießbrei verteilen, mit Zimt bestäuben.');
  r('lachs-bagel', 'Bagel mit Frischkäse & Räucherlachs', 10, 2, 'toast:creme,lachs,kraut',
    '2 Stk Bagels|100 g Frischkäse|100 g Räucherlachs|0.5 Gurke|1 Stk rote Zwiebel|1 TL Kapern|0.5 Bund Dill',
    'Bagels halbieren und toasten.|Mit Frischkäse bestreichen.|Mit Lachs, Gurkenscheiben, Zwiebelringen, Kapern und Dill belegen.');
  r('menemen', 'Menemen (türkisches Rührei)', 20, 2, 'teller:tomate,eigelb,paprika',
    '4 Eier|3 Tomaten|2 Stk Spitzpaprika|1 Zwiebel|2 EL Olivenöl|1 TL Pul Biber|Salz|1 Stk Fladenbrot',
    'Zwiebel und Paprika in Öl weich dünsten.|Tomaten würfeln, zugeben und 5 Minuten schmoren.|Eier darüberschlagen und unter leichtem Rühren cremig stocken lassen.|Mit Pul Biber würzen und mit Fladenbrot servieren.');
  r('kaese-schinken-omelett', 'Käse-Schinken-Omelett', 15, 1, 'gefaltet:eigelb,speck,kraut',
    '3 Eier|2 EL Milch|40 g Gouda / Schnittkäse|40 g Kochschinken|10 g Butter|1 EL Schnittlauch|Salz, Pfeffer',
    'Eier mit Milch, Salz und Pfeffer verquirlen.|In Butter bei mittlerer Hitze stocken lassen.|Schinken und Käse auf eine Hälfte geben, zusammenklappen und kurz ziehen lassen.|Mit Schnittlauch bestreuen.');
  r('ei-muffins', 'Gemüse-Ei-Muffins', 30, 6, 'muffin:eigelb,paprika,spinat',
    '8 Eier|1 Paprika|100 g Spinat|80 g Feta|4 Stk Frühlingszwiebeln|50 ml Milch|Salz, Pfeffer',
    'Ofen auf 180 °C vorheizen, ein Muffinblech fetten.|Gemüse klein schneiden und auf 12 Mulden verteilen, Feta darüberbröseln.|Eier mit Milch, Salz und Pfeffer verquirlen und darübergießen.|20 Minuten backen, bis die Muffins gestockt sind.');
  r('tamagoyaki', 'Tamagoyaki (japanisches Omelett)', 20, 2, 'stuecke:eigelb,keine,nori',
    '4 Eier|1 EL Sojasauce|1 EL Mirin|1 TL Zucker|1 EL Sonnenblumenöl',
    'Eier mit Sojasauce, Mirin und Zucker verquirlen.|Eine dünne Schicht in die geölte Pfanne geben, leicht stocken lassen und aufrollen.|Rolle zur Seite schieben, nächste Schicht eingießen und darum wickeln – wiederholen.|Etwas abkühlen lassen und in Scheiben schneiden.');
  r('huettenkaese-bowl', 'Hüttenkäse-Bowl mit Obst', 5, 1, 'suppe:joghurt,pfirsich,nuss',
    '200 g Hüttenkäse|1 Stk Pfirsich|50 g Heidelbeeren|1 EL Honig|1 EL Walnüsse',
    'Hüttenkäse in eine Schale geben.|Pfirsich in Spalten schneiden und mit den Beeren darauf verteilen.|Mit Honig und gehackten Walnüssen toppen.');
  r('pb-bananen-toast', 'Erdnussbutter-Bananen-Toast', 5, 1, 'toast:nuss,banane,zimt',
    '2 Stk Vollkorntoast|2 EL Erdnussmus|1 Banane|1 TL Honig|1 Prise Zimt',
    'Toast rösten und mit Erdnussmus bestreichen.|Banane in Scheiben darauf verteilen.|Mit Honig beträufeln und mit Zimt bestäuben.');
  r('buchweizen-porridge', 'Buchweizen-Porridge mit Birne', 20, 2, 'suppe:creme,apfel,nuss',
    '120 g Buchweizen|400 ml Hafermilch (angereichert)|1 Stk Birne|1 EL Ahornsirup|1 TL Zimt|20 g Walnüsse',
    'Buchweizen waschen und mit Hafermilch 15 Minuten sanft köcheln.|Birne würfeln und die letzten 5 Minuten mitgaren.|Mit Ahornsirup und Zimt abschmecken, mit Walnüssen bestreuen.');
  r('caprese-toast', 'Tomaten-Mozzarella-Toast', 10, 2, 'toast:tomate,ei,kraut',
    '4 Stk Ciabatta (Scheiben)|2 Tomaten|125 g Mozzarella|1 EL Olivenöl|4 Stk Basilikumblätter|Salz, Pfeffer',
    'Ciabatta rösten und mit Öl beträufeln.|Abwechselnd mit Tomaten- und Mozzarellascheiben belegen.|Würzen und mit Basilikum garnieren.');

  /* ==================== Snack ==================== */
  kat = 'Snack';
  r('hummus', 'Hummus mit Fladenbrot', 15, 4, 'dip:creme,brot,paprika',
    '480 g Kichererbsen (Dose)|3 EL Tahin (Sesammus)|1 Zitrone|1 Zehen Knoblauch|4 EL Olivenöl|1 TL Kreuzkümmel|1 TL Paprikapulver|1 Stk Fladenbrot',
    'Kichererbsen abgießen, etwas Flüssigkeit auffangen.|Mit Tahin, Zitronensaft, Knoblauch, 2 EL Öl und Kreuzkümmel cremig pürieren.|Mit restlichem Öl und Paprikapulver anrichten, Fladenbrot dazu reichen.');
  r('guacamole', 'Guacamole mit Nachos', 10, 4, 'dip:avocado,mais,tomate',
    '3 Avocado|1 Limette|1 Tomaten|0.5 Stk rote Zwiebel|0.5 Bund Koriander|Salz|200 g Tortilla-Chips',
    'Avocados zerdrücken und mit Limettensaft mischen.|Tomate und Zwiebel fein würfeln, Koriander hacken und unterrühren.|Salzen und mit Tortilla-Chips servieren.');
  r('bruschetta', 'Bruschetta', 15, 4, 'toast:tomate,kraut,zwiebel',
    '1 Stk Baguette|4 Tomaten|1 Zehen Knoblauch|3 EL Olivenöl|0.5 Bund Basilikum|Salz, Pfeffer',
    'Baguette in Scheiben schneiden und rösten, mit Knoblauch einreiben.|Tomaten fein würfeln, mit Öl, Basilikum, Salz und Pfeffer mischen.|Kurz vor dem Servieren auf die Brote geben.');
  r('caprese-spiesse', 'Caprese-Spieße', 10, 4, 'spiesse:tomate,ei,kraut',
    '250 g Kirschtomaten|250 g Mini-Mozzarella|1 Bund Basilikum|2 EL Balsamico-Creme|1 EL Olivenöl',
    'Tomaten, Mozzarella und Basilikum abwechselnd auf Spieße stecken.|Mit Öl beträufeln.|Mit Balsamico-Creme garnieren.');
  r('tzatziki-gemuese', 'Tzatziki mit Gemüsesticks', 15, 4, 'dip:joghurt,karotte,gurke',
    '500 g Griechischer Joghurt|1 Gurke|2 Zehen Knoblauch|1 EL Olivenöl|1 EL Dill|2 Karotten|1 Paprika',
    'Gurke raspeln, salzen und gut ausdrücken.|Mit Joghurt, gepresstem Knoblauch, Öl und Dill verrühren.|Karotten und Paprika in Sticks schneiden und dazu reichen.');
  r('gefuellte-eier', 'Gefüllte Eier', 25, 4, 'ei:paprika,kraut',
    '6 Eier|3 EL Mayonnaise|1 TL Senf|1 Prise Paprikapulver|1 EL Schnittlauch|Salz, Pfeffer',
    'Eier 10 Minuten hart kochen, abschrecken und pellen.|Halbieren, Eigelb herauslösen und mit Mayonnaise, Senf, Salz und Pfeffer cremig rühren.|Creme in die Eiweißhälften spritzen, mit Paprika und Schnittlauch garnieren.');
  r('ofen-kichererbsen', 'Knusprige Ofen-Kichererbsen', 35, 4, 'kugeln:kuerbis,paprika',
    '480 g Kichererbsen (Dose)|2 EL Olivenöl|1 TL Paprikapulver|0.5 TL Kreuzkümmel|1 Prise Salz',
    'Ofen auf 200 °C vorheizen.|Kichererbsen abspülen und sehr gut trocken tupfen.|Mit Öl und Gewürzen mischen und 25–30 Minuten knusprig rösten.');
  r('edamame', 'Edamame mit Meersalz', 10, 2, 'kugeln:avocado,sesam',
    '400 g Edamame (TK)|1 TL Meersalz|1 TL Sesam|1 Prise Chiliflocken',
    'Edamame 5 Minuten in Salzwasser kochen.|Abgießen und mit Meersalz, Sesam und Chili bestreuen.|Warm servieren – die Bohnen aus der Schale zuzeln.');
  r('zimt-popcorn', 'Zimt-Popcorn', 10, 4, 'kugeln:sahne,zimt',
    '80 g Popcornmais|2 EL Kokosöl|2 EL Zucker|1 TL Zimt',
    'Öl in einem großen Topf erhitzen, Mais zugeben und Deckel schließen.|Bei mittlerer Hitze poppen lassen, dabei den Topf rütteln.|Zucker und Zimt mischen und über das warme Popcorn streuen.');
  r('energy-balls', 'Dattel-Kakao-Energy-Balls', 15, 12, 'kugeln:kakao,kokos',
    '200 g Datteln (entsteint)|100 g Mandeln|2 EL Kakao|2 EL Kokosraspeln|1 Prise Salz',
    'Mandeln im Mixer fein hacken.|Datteln, Kakao und Salz zugeben und zu einer klebrigen Masse mixen.|Kleine Kugeln formen und in Kokosraspeln wälzen. Gekühlt aufbewahren.');
  r('muesliriegel', 'Müsliriegel ohne Backen', 20, 12, 'stuecke:teig,keine,nuss',
    '200 g Haferflocken|100 g Erdnussmus|80 g Honig|50 g Mandeln|50 g Cranberrys|2 EL Chiasamen',
    'Erdnussmus und Honig leicht erwärmen und verrühren.|Haferflocken, gehackte Mandeln, Cranberrys und Chiasamen untermischen.|In eine mit Backpapier ausgelegte Form drücken und 2 Stunden kühlen.|In Riegel schneiden.');
  r('patatas-bravas', 'Patatas Bravas', 40, 4, 'pommes:kartoffel,tomate',
    '800 g Kartoffeln|3 EL Olivenöl|1 TL Paprikapulver (geräuchert)|200 g Dosentomaten (gehackt)|1 Zehen Knoblauch|1 Prise Chiliflocken|3 EL Aioli',
    'Kartoffeln würfeln, mit Öl mischen und bei 220 °C 30 Minuten knusprig backen.|Knoblauch anschwitzen, Tomaten, Paprika und Chili zugeben und zu einer dicken Sauce einkochen.|Kartoffeln mit Bravas-Sauce und Aioli servieren.');
  r('suesskartoffel-pommes', 'Süßkartoffel-Pommes', 35, 2, 'pommes:kuerbis,joghurt',
    '600 g Süßkartoffel|1 EL Speisestärke|2 EL Olivenöl|1 TL Paprikapulver|Salz|100 g Naturjoghurt',
    'Süßkartoffeln in Stifte schneiden, mit Stärke bestäuben.|Mit Öl und Paprika mischen und mit Abstand auf ein Blech legen.|Bei 220 °C 25 Minuten backen, nach der Hälfte wenden.|Salzen und mit Joghurt-Dip servieren.');
  r('gemuesechips', 'Gemüsechips aus dem Ofen', 45, 4, 'kekse:rote,kuerbis',
    '1 Stk Rote Bete|1 Stk Pastinake|1 Süßkartoffel|2 EL Olivenöl|1 TL Meersalz',
    'Gemüse hauchdünn hobeln.|Mit Öl dünn einpinseln und auf Backpapier verteilen.|Bei 120 °C Umluft 30–40 Minuten trocknen, bis sie knusprig sind. Salzen.');
  r('sommerrollen', 'Vietnamesische Sommerrollen', 30, 4, 'rollen:reis,karotte,garnele',
    '8 Stk Reispapier|100 g Reisnudeln|200 g Garnelen|1 Karotte|0.5 Gurke|1 Bund Minze|50 g Erdnussmus|2 EL Sojasauce|1 Limette',
    'Reisnudeln nach Packung garen, Garnelen kurz braten.|Gemüse in feine Streifen schneiden.|Reispapier einweichen, mit Nudeln, Gemüse, Minze und Garnelen belegen und fest einrollen.|Erdnussmus mit Sojasauce, Limettensaft und Wasser zum Dip verrühren.');
  r('mozzarella-sticks', 'Mozzarella-Sticks', 25, 4, 'pommes:kaese,tomate',
    '250 g Mozzarella (Stange)|2 Eier|50 g Weizenmehl|100 g Paniermehl|1 TL Kräuter (italienisch)|300 ml Sonnenblumenöl|150 ml Tomatensauce',
    'Mozzarella in Sticks schneiden und 20 Minuten anfrieren.|Erst in Mehl, dann in Ei und in Paniermehl mit Kräutern wälzen – zweimal panieren.|Im heißen Öl rundum goldbraun frittieren.|Mit Tomatensauce zum Dippen servieren.');
  r('obstspiesse', 'Obstspieße mit Schokodip', 15, 4, 'spiesse:erdbeere,banane,gruenapfel',
    '250 g Erdbeeren|2 Banane|1 Stk Kiwi|200 g Ananas|100 g Zartbitterschokolade|50 ml Sahne',
    'Obst in mundgerechte Stücke schneiden und auf Spieße stecken.|Schokolade mit Sahne über dem Wasserbad schmelzen.|Spieße in den Schokodip tunken.');
  r('datteln-speck', 'Datteln im Speckmantel', 20, 4, 'kugeln:speck,keine',
    '16 Stk Datteln (entsteint)|8 Stk Bacon (Scheiben)|50 g Ziegenfrischkäse',
    'Datteln mit etwas Frischkäse füllen.|Baconscheiben halbieren und um die Datteln wickeln.|Bei 200 °C 12–15 Minuten knusprig backen.');
  r('gurken-maki', 'Gurken-Maki', 45, 4, 'rollen:nori,reis,gurke',
    '250 g Sushireis|3 EL Reisessig|1 EL Zucker|4 Stk Noriblätter|1 Gurke|Sojasauce, Wasabi, Ingwer',
    'Reis waschen, garen und mit Essig und Zucker würzen, abkühlen lassen.|Nori auf eine Bambusmatte legen, dünn mit Reis bestreichen.|Gurkenstreifen auflegen und fest aufrollen.|Mit nassem Messer in Stücke schneiden, mit Sojasauce, Wasabi und Ingwer servieren.');
  r('obazda', 'Obazda mit Brezeln', 15, 4, 'dip:orange,brot,zwiebel',
    '200 g Camembert|50 g Butter|100 g Frischkäse|1 TL Paprikapulver|0.5 Zwiebel|1 Prise Kümmel|4 Stk Laugenbrezeln',
    'Camembert klein schneiden und mit weicher Butter und Frischkäse zerdrücken.|Fein gehackte Zwiebel, Paprika und Kümmel untermischen.|Kurz durchziehen lassen und mit Brezeln servieren.');
  r('baba-ganoush', 'Baba Ganoush', 50, 4, 'dip:grau,brot,kraut',
    '2 Aubergine|2 EL Tahin (Sesammus)|1 Zitrone|1 Zehen Knoblauch|2 EL Olivenöl|0.5 Bund Petersilie|Salz',
    'Auberginen mehrfach einstechen und bei 220 °C 40 Minuten rösten, bis sie weich sind.|Fruchtfleisch herauskratzen und abtropfen lassen.|Mit Tahin, Zitronensaft, Knoblauch und Salz zerdrücken.|Mit Öl und Petersilie anrichten.');
  r('gewuerznuesse', 'Geröstete Gewürznüsse', 20, 6, 'kugeln:nuss,zimt',
    '300 g Nussmischung|1 Stk Eiweiß|2 EL Ahornsirup|1 TL Zimt|0.5 TL Paprikapulver|1 Prise Salz',
    'Eiweiß leicht schaumig schlagen und mit Ahornsirup und Gewürzen verrühren.|Nüsse darin wenden und auf einem Blech verteilen.|Bei 160 °C 15 Minuten rösten, abkühlen lassen.');
  r('joghurt-bites', 'Gefrorene Joghurt-Beeren-Bites', 15, 4, 'kugeln:joghurt,beere',
    '300 g Griechischer Joghurt|2 EL Honig|150 g Beeren (TK-Mix)',
    'Joghurt mit Honig verrühren.|Beeren unterheben und kleine Kleckse auf Backpapier setzen.|Mindestens 2 Stunden einfrieren.');
  r('wrap-roellchen', 'Frischkäse-Wrap-Röllchen', 15, 4, 'rollen:tortilla,creme,kraut',
    '3 Stk Weizen-Tortilla|200 g Frischkäse|1 Paprika|100 g Kochschinken|50 g Rucola',
    'Tortillas mit Frischkäse bestreichen.|Mit Schinken, Paprikastreifen und Rucola belegen.|Fest aufrollen, 30 Minuten kühlen und in Scheiben schneiden.');
  r('nachos-ueberbacken', 'Überbackene Nachos', 15, 4, 'taco:hack,kaese,avocado',
    '200 g Tortilla-Chips|150 g Cheddar|200 g Kidneybohnen (Dose)|1 Tomaten|2 Stk Jalapeños (Glas)|100 g Schmand|1 Avocado',
    'Chips auf einem Blech verteilen, Bohnen und Tomatenwürfel darübergeben.|Mit geriebenem Cheddar und Jalapeños bestreuen.|Bei 200 °C 8 Minuten überbacken, bis der Käse schmilzt.|Mit Schmand und Avocadowürfeln servieren.');

  /* ==================== Hauptgerichte nach Küchen ==================== */
  kat = 'Hauptgericht';

  kueche = 'Italienisch';
  r('pizza-margherita', 'Pizza Margherita', 90, 2, 'pizza:tomate,ei,kraut',
    '300 g Weizenmehl (Typ 00)|7 g Trockenhefe|190 ml Wasser|1 TL Salz|2 EL Olivenöl|200 g Passierte Tomaten|1 TL Oregano|250 g Mozzarella|1 Bund Basilikum',
    'Mehl, Hefe, Salz, Wasser und 1 EL Öl 8 Minuten zu einem glatten Teig kneten und 1 Stunde gehen lassen.|Ofen mit Blech auf höchster Stufe (250 °C) vorheizen.|Teig in 2 Portionen dünn ausziehen, mit gewürzten Tomaten bestreichen und Mozzarella darauf zupfen.|8–10 Minuten backen, mit Basilikum und restlichem Öl servieren.');
  r('carbonara', 'Spaghetti Carbonara', 25, 2, 'pasta:nudel,eigelb,speck',
    '200 g Spaghetti|100 g Guanciale oder Pancetta|2 Eier|1 Eigelb|50 g Pecorino|Pfeffer',
    'Spaghetti in Salzwasser al dente kochen.|Guanciale würfeln und langsam knusprig auslassen.|Eier, Eigelb, geriebenen Pecorino und viel Pfeffer verrühren.|Spaghetti mit etwas Kochwasser zum Speck geben, Pfanne vom Herd nehmen und die Eimasse schnell unterrühren, bis sie cremig wird.');
  r('arrabbiata', 'Penne all’Arrabbiata', 25, 2, 'pasta:nudel,tomate,paprika',
    '200 g Penne|400 g Dosentomaten (gehackt)|2 Zehen Knoblauch|1 Stk Chilischote|3 EL Olivenöl|0.5 Bund Petersilie|30 g Parmesan',
    'Knoblauch und Chili fein hacken und in Öl anschwitzen.|Tomaten zugeben und 15 Minuten scharf einkochen.|Penne al dente kochen und in der Sauce schwenken.|Mit Petersilie und Parmesan servieren.');
  r('saltimbocca', 'Saltimbocca alla Romana', 25, 2, 'teller:haehnchen,spinat,speck',
    '4 Stk Kalbsschnitzel (dünn)|4 Stk Parmaschinken (Scheiben)|4 Stk Salbeiblätter|20 g Butter|100 ml Weißwein|1 EL Weizenmehl|Pfeffer',
    'Schnitzel flach klopfen, mit je einem Salbeiblatt und einer Scheibe Schinken belegen und feststecken.|Unterseite leicht mehlieren.|In Butter zuerst auf der Schinkenseite, dann auf der anderen Seite je 2 Minuten braten.|Mit Weißwein ablöschen, kurz einkochen und die Sauce über das Fleisch geben.');
  r('minestrone', 'Minestrone', 45, 4, 'suppe:tomate,nudel,kraut',
    '1 Zwiebel|2 Karotten|2 Stk Stangensellerie|1 Zucchini|400 g Dosentomaten (gehackt)|1 l Gemüsebrühe|240 g Weiße Bohnen (Dose)|80 g Suppennudeln|2 EL Olivenöl|30 g Parmesan|2 EL Pesto',
    'Zwiebel, Karotten und Sellerie würfeln und in Öl 5 Minuten andünsten.|Zucchini, Tomaten und Brühe zugeben und 15 Minuten köcheln.|Bohnen und Nudeln zufügen und weitere 10 Minuten garen.|Mit Parmesan und einem Klecks Pesto servieren.');

  kueche = 'Deutsch';
  r('kaesespaetzle', 'Allgäuer Käsespätzle', 40, 4, 'auflauf:kaese,zwiebel,kraut',
    '400 g Weizenmehl|4 Eier|150 ml Wasser|1 TL Salz|250 g Bergkäse|3 Zwiebel|30 g Butter|0.5 Bund Schnittlauch',
    'Mehl, Eier, Wasser und Salz zu einem zähen Teig schlagen, bis er Blasen wirft.|Teig portionsweise in kochendes Salzwasser schaben oder drücken, aufschwimmende Spätzle abschöpfen.|Spätzle schichtweise mit geriebenem Käse in eine Form geben und warm halten.|Zwiebelringe in Butter goldbraun rösten und darüber verteilen, mit Schnittlauch bestreuen.');
  r('rouladen', 'Rinderrouladen mit Rotkohl', 150, 4, 'teller:fleisch,lila,kartoffel',
    '4 Stk Rinderrouladen|2 EL Senf|4 Stk Bacon (Scheiben)|2 Stk Gewürzgurken|2 Zwiebel|2 EL Tomatenmark|250 ml Rotwein|500 ml Rinderfond|700 g Rotkohl (Glas)|800 g Kartoffeln',
    'Rouladen mit Senf bestreichen, mit Bacon, Gurkenstreifen und Zwiebelstreifen belegen, aufrollen und feststecken.|Rundum scharf anbraten, Tomatenmark kurz mitrösten.|Mit Wein und Fond ablöschen und zugedeckt 90 Minuten schmoren.|Rotkohl erwärmen, Kartoffeln kochen, Sauce abschmecken und alles zusammen servieren.');
  r('koenigsberger-klopse', 'Königsberger Klopse', 50, 4, 'kugeln:creme,sahne,kraut',
    '500 g Gemischtes Hackfleisch|1 Stk Brötchen (vom Vortag)|1 Zwiebel|1 Eier|1 l Gemüsebrühe|30 g Butter|30 g Weizenmehl|100 ml Sahne|2 EL Kapern|1 Zitrone|250 g Reis',
    'Brötchen einweichen, ausdrücken und mit Hack, Zwiebelwürfeln, Ei, Salz und Pfeffer verkneten.|Klopse formen und in siedender Brühe 15 Minuten garziehen lassen.|Butter und Mehl anschwitzen, mit 500 ml Brühe ablöschen, Sahne, Kapern und Zitronensaft zugeben.|Klopse in die Sauce geben und mit Reis servieren.');
  r('schnitzel-kartoffelsalat', 'Schnitzel mit Kartoffelsalat', 60, 4, 'teller:kruste,kartoffel,zitrone',
    '4 Stk Schweineschnitzel|2 Eier|60 g Weizenmehl|150 g Paniermehl|100 ml Sonnenblumenöl|1 kg Kartoffeln (festkochend)|1 Zwiebel|250 ml Gemüsebrühe|4 EL Weißweinessig|4 EL Sonnenblumenöl|1 TL Senf|1 Zitrone',
    'Kartoffeln kochen, pellen und in Scheiben schneiden. Zwiebel in der Brühe aufkochen, mit Essig, Öl und Senf über die warmen Kartoffeln geben und 30 Minuten ziehen lassen.|Schnitzel dünn klopfen, salzen und nacheinander in Mehl, Ei und Paniermehl wenden.|In reichlich heißem Öl auf beiden Seiten goldbraun ausbacken.|Mit Kartoffelsalat und Zitronenspalten servieren.');
  r('linseneintopf', 'Linseneintopf mit Würstchen', 60, 4, 'eintopf:linse,wurst,kraut',
    '250 g Tellerlinsen|1 Zwiebel|2 Karotten|200 g Knollensellerie|300 g Kartoffeln|1.2 l Gemüsebrühe|4 Stk Wiener Würstchen|3 EL Essig|1 TL Majoran',
    'Zwiebel und Gemüse würfeln und in etwas Öl andünsten.|Linsen, Kartoffeln und Brühe zugeben und 40 Minuten köcheln.|Würstchen in Scheiben darin erwärmen.|Mit Essig, Majoran, Salz und Pfeffer abschmecken.');
  r('frikadellen-pueree', 'Frikadellen mit Kartoffelpüree', 45, 4, 'teller:hack,kartoffel,erbse',
    '500 g Rinderhack|1 Stk Brötchen (vom Vortag)|1 Zwiebel|1 Eier|1 TL Senf|1 kg Kartoffeln (mehligkochend)|200 ml Milch|40 g Butter|1 Prise Muskat|300 g Erbsen (TK)',
    'Brötchen einweichen, ausdrücken und mit Hack, Zwiebelwürfeln, Ei, Senf, Salz und Pfeffer verkneten.|8 Frikadellen formen und in Öl von jeder Seite 5 Minuten braten.|Kartoffeln kochen, mit warmer Milch, Butter und Muskat zu Püree stampfen.|Erbsen garen und alles zusammen anrichten.');
  r('maultaschen', 'Maultaschen in der Brühe', 30, 4, 'suppe:bruehe,teig,kraut',
    '8 Stk Maultaschen (Kühlregal)|1.2 l Rinderbrühe|1 Karotte|1 Stk Lauch|1 Zwiebel|20 g Butter|0.5 Bund Schnittlauch',
    'Karotte und Lauch in feine Streifen schneiden und in der Brühe 5 Minuten garen.|Maultaschen darin 10 Minuten ziehen lassen.|Zwiebelringe in Butter bräunen.|Maultaschen mit Brühe anrichten, mit Schmelzzwiebeln und Schnittlauch bestreuen.');
  r('himmel-und-erde', 'Himmel un Ääd', 40, 4, 'teller:kartoffel,wurst,apfel',
    '1 kg Kartoffeln|4 Aepfel|1 EL Zucker|200 ml Milch|40 g Butter|400 g Blutwurst|2 Zwiebel',
    'Kartoffeln kochen und mit Milch und Butter zu Püree stampfen.|Äpfel in Spalten schneiden und mit Zucker und etwas Wasser weich dünsten.|Blutwurst in Scheiben braten, Zwiebelringe dazu goldbraun rösten.|Püree mit Apfelkompott, Blutwurst und Zwiebeln anrichten.');
  r('sauerbraten', 'Rheinischer Sauerbraten', 180, 6, 'teller:fleisch,sosse,kartoffel',
    '1.2 kg Rinderbraten (Schaufel)|500 ml Rotwein|250 ml Rotweinessig|2 Zwiebel|1 Karotte|5 Stk Wacholderbeeren|2 Stk Lorbeerblätter|80 g Rosinen|60 g Printen oder Lebkuchen|1 kg Kartoffeln|700 g Rotkohl (Glas)',
    'Fleisch mit Wein, Essig, Gemüse und Gewürzen 3–5 Tage im Kühlschrank marinieren.|Fleisch trocken tupfen, rundum anbraten und mit der Marinade 2,5 Stunden schmoren.|Sauce durchsieben, mit zerbröselten Printen und Rosinen sämig einkochen.|Mit Kartoffelklößen oder Salzkartoffeln und Rotkohl servieren.');

  kueche = 'Mexikanisch';
  r('haehnchen-tacos', 'Hähnchen-Tacos mit Pico de Gallo', 30, 4, 'taco:haehnchen,tomate,avocado',
    '8 Stk Mais-Tortillas (klein)|500 g Hähnchenbrust|1 TL Kreuzkümmel|1 TL Paprikapulver|3 Tomaten|1 Stk rote Zwiebel|1 Limette|0.5 Bund Koriander|1 Avocado|100 g Schmand',
    'Hähnchen in Streifen schneiden, mit Gewürzen und Öl marinieren und scharf anbraten.|Tomaten, Zwiebel und Koriander fein hacken, mit Limettensaft und Salz zu Pico de Gallo mischen.|Tortillas in einer trockenen Pfanne erwärmen.|Mit Hähnchen, Pico de Gallo, Avocado und Schmand füllen.');
  r('enchiladas', 'Bohnen-Enchiladas', 50, 4, 'auflauf:sosse,kaese,kraut',
    '8 Stk Weizen-Tortilla|480 g Kidneybohnen (Dose)|200 g Mais (Dose)|1 Zwiebel|1 Paprika|500 g Passierte Tomaten|1 TL Kreuzkümmel|1 TL Chilipulver|150 g Cheddar',
    'Zwiebel und Paprika anbraten, Bohnen, Mais und die Hälfte der Gewürze zugeben.|Passierte Tomaten mit restlichen Gewürzen zur Sauce verrühren.|Tortillas füllen, aufrollen und in eine Form legen.|Mit Sauce und Käse bedecken und bei 200 °C 20 Minuten backen.');
  r('quesadillas', 'Quesadillas mit Paprika & Käse', 20, 2, 'gefaltet:tortilla,paprika,kaese',
    '4 Stk Weizen-Tortilla|150 g Cheddar|1 Paprika|100 g Mais (Dose)|2 Stk Frühlingszwiebeln|1 Stk Jalapeño|100 g Schmand',
    'Paprika, Frühlingszwiebeln und Jalapeño klein schneiden.|Je eine Tortillahälfte mit Käse und Gemüse belegen und zuklappen.|In einer trockenen Pfanne von beiden Seiten knusprig braten.|In Dreiecke schneiden und mit Schmand servieren.');
  r('fajitas', 'Rinder-Fajitas', 35, 4, 'wrap:fleisch,paprika,zwiebel',
    '500 g Rinderhüftsteak|3 Paprika|2 Zwiebel|2 EL Olivenöl|1 Limette|1 TL Kreuzkümmel|1 TL Paprikapulver (geräuchert)|8 Stk Weizen-Tortilla|150 g Guacamole',
    'Fleisch in Streifen schneiden und mit Limettensaft, Öl und Gewürzen marinieren.|Paprika und Zwiebeln in Streifen scharf anbraten, herausnehmen.|Fleisch 2–3 Minuten braten, Gemüse wieder zugeben.|In warmen Tortillas mit Guacamole servieren.');
  r('burrito-bowl', 'Burrito-Bowl', 35, 2, 'bowl:reis,bohne,mais',
    '150 g Reis|1 Limette|240 g Schwarze Bohnen (Dose)|150 g Mais (Dose)|2 Tomaten|1 Avocado|250 g Rinderhack|1 TL Kreuzkümmel|50 g Cheddar|0.5 Bund Koriander',
    'Reis kochen und mit Limettensaft und Koriander mischen.|Hack mit Kreuzkümmel krümelig braten.|Bohnen und Mais erwärmen, Tomaten und Avocado würfeln.|Alles nebeneinander in Schalen anrichten und mit Cheddar bestreuen.');
  r('sopa-de-tortilla', 'Sopa de Tortilla', 40, 4, 'suppe:tomate,tortilla,avocado',
    '1 Zwiebel|2 Zehen Knoblauch|1 Stk Chipotle-Chili|400 g Dosentomaten (gehackt)|1 l Hühnerbrühe|300 g Hähnchenbrust|4 Stk Mais-Tortillas|1 Avocado|100 g Feta|1 Limette',
    'Zwiebel, Knoblauch und Chili anbraten, Tomaten und Brühe zugeben und 15 Minuten köcheln, dann pürieren.|Hähnchen in der Suppe 15 Minuten garen, herausnehmen und zerzupfen.|Tortillas in Streifen schneiden und im Ofen knusprig backen.|Suppe mit Hähnchen, Tortillastreifen, Avocado, Käse und Limette servieren.');

  kueche = 'Indisch';
  r('butter-chicken', 'Butter Chicken', 50, 4, 'curry:orange,haehnchen,kraut',
    '600 g Hähnchenbrust|150 g Naturjoghurt|2 TL Garam Masala|1 Zwiebel|3 Zehen Knoblauch|20 g Ingwer|40 g Butter|400 g Passierte Tomaten|150 ml Sahne|250 g Basmatireis',
    'Hähnchen würfeln und mit Joghurt und 1 TL Garam Masala 30 Minuten marinieren.|Hähnchen in einer Pfanne anbraten und herausnehmen.|Zwiebel, Knoblauch und Ingwer in Butter dünsten, restliches Garam Masala und Tomaten zugeben und 10 Minuten köcheln.|Sahne und Hähnchen zugeben, 10 Minuten ziehen lassen und mit Reis servieren.');
  r('chana-masala', 'Chana Masala', 35, 4, 'curry:sosse,kichererbse,kraut',
    '480 g Kichererbsen (Dose)|1 Zwiebel|2 Zehen Knoblauch|15 g Ingwer|400 g Dosentomaten (gehackt)|1 TL Kreuzkümmel|2 TL Garam Masala|1 TL Kurkuma|0.5 Bund Koriander|250 g Basmatireis',
    'Kreuzkümmel in Öl anrösten, Zwiebel, Knoblauch und Ingwer zugeben.|Gewürze und Tomaten zugeben und 10 Minuten einkochen.|Kichererbsen zufügen und 10 Minuten köcheln.|Mit Koriander bestreuen und mit Reis oder Naan servieren.');
  r('palak-paneer', 'Palak Paneer', 40, 4, 'curry:spinat,ei,sahne',
    '500 g Spinat|250 g Paneer|1 Zwiebel|2 Zehen Knoblauch|15 g Ingwer|1 Stk grüne Chilischote|1 TL Garam Masala|100 ml Sahne|2 EL Ghee',
    'Spinat kurz blanchieren, abschrecken und fein pürieren.|Paneer würfeln und in Ghee goldbraun braten.|Zwiebel, Knoblauch, Ingwer und Chili anbraten, Garam Masala zugeben.|Spinatpüree und Sahne einrühren, Paneer zugeben und 5 Minuten ziehen lassen.');
  r('gemuese-biryani', 'Gemüse-Biryani', 60, 4, 'teller:curry,karotte,nuss',
    '300 g Basmatireis|1 Zwiebel|2 Karotten|200 g Blumenkohl|100 g Erbsen (TK)|150 g Naturjoghurt|2 TL Biryani-Gewürz|1 Pck Safranfäden|30 g Cashewkerne|2 EL Ghee',
    'Reis 10 Minuten vorkochen und abgießen.|Zwiebel in Ghee karamellisieren, Gemüse und Gewürz zugeben, Joghurt einrühren.|Gemüse und Reis in einem Topf schichten, Safran in etwas Wasser darüberträufeln.|Zugedeckt 20 Minuten bei kleiner Hitze garen, mit gerösteten Cashews bestreuen.');
  r('rogan-josh', 'Lamm Rogan Josh', 100, 4, 'curry:sosse,fleisch,kraut',
    '700 g Lammschulter|2 Zwiebel|3 Zehen Knoblauch|20 g Ingwer|2 TL Paprikapulver|1 TL Kreuzkümmel|1 TL Garam Masala|150 g Naturjoghurt|200 g Dosentomaten (gehackt)|250 g Basmatireis',
    'Lamm würfeln und portionsweise kräftig anbraten.|Zwiebeln, Knoblauch und Ingwer im Bratfett dünsten, Gewürze kurz mitrösten.|Joghurt löffelweise einrühren, Tomaten und Fleisch zugeben.|Zugedeckt 75 Minuten schmoren, bis das Fleisch zart ist. Mit Reis servieren.');

  kueche = 'Asiatisch';
  r('pad-thai', 'Pad Thai', 30, 2, 'pasta:nudel,garnele,limette',
    '200 g Reisbandnudeln|200 g Garnelen|2 Eier|150 g Sojasprossen|3 Stk Frühlingszwiebeln|3 EL Fischsauce|2 EL Tamarindenpaste|1 EL Zucker|40 g Erdnüsse|1 Limette',
    'Nudeln in warmem Wasser einweichen.|Garnelen im Wok anbraten, zur Seite schieben und Eier darin stocken lassen.|Nudeln, Fischsauce, Tamarinde und Zucker zugeben und unter Rühren braten.|Sprossen und Frühlingszwiebeln unterheben, mit Erdnüssen und Limette servieren.');
  r('gruenes-thai-curry', 'Grünes Thai-Curry mit Hähnchen', 30, 4, 'curry:matcha,haehnchen,paprika',
    '500 g Hähnchenbrust|2 EL Grüne Currypaste|400 ml Kokosmilch|1 Zucchini|1 Paprika|100 g Zuckerschoten|2 EL Fischsauce|1 Bund Thai-Basilikum|250 g Jasminreis',
    'Currypaste in etwas Kokosmilch anrösten.|Hähnchenstreifen zugeben und kurz anbraten.|Restliche Kokosmilch und Gemüse zugeben und 10 Minuten köcheln.|Mit Fischsauce abschmecken, Basilikum unterheben und mit Reis servieren.');
  r('gebratener-reis', 'Gebratener Eierreis', 20, 2, 'teller:reis,erbse,eigelb',
    '300 g Reis (gekocht, vom Vortag)|2 Eier|100 g Erbsen (TK)|1 Karotte|3 Stk Frühlingszwiebeln|2 EL Sojasauce|1 TL Sesamöl|1 EL Sonnenblumenöl',
    'Eier im heißen Wok rühren und herausnehmen.|Karottenwürfel und Erbsen 2 Minuten braten.|Reis zugeben und unter Rühren kräftig braten.|Sojasauce, Sesamöl, Ei und Frühlingszwiebeln untermischen.');
  r('ramen', 'Shoyu-Ramen', 45, 2, 'suppe:bruehe,nudel,eigelb',
    '200 g Ramen-Nudeln|1 l Hühnerbrühe|3 EL Sojasauce|1 EL Mirin|20 g Ingwer|2 Zehen Knoblauch|2 Eier|200 g Schweinebauch (gegart)|100 g Pak Choi|2 Stk Frühlingszwiebeln|1 Stk Noriblatt',
    'Brühe mit Sojasauce, Mirin, Ingwer und Knoblauch 20 Minuten ziehen lassen.|Eier 6½ Minuten kochen, abschrecken, pellen.|Nudeln garen, Pak Choi kurz in der Brühe blanchieren.|Nudeln in Schalen geben, mit Brühe übergießen und mit Fleisch, Ei, Pak Choi, Frühlingszwiebeln und Nori belegen.');
  r('teriyaki-haehnchen', 'Teriyaki-Hähnchen mit Reis', 30, 2, 'bowl:reis,karamell,kraut',
    '400 g Hähnchenschenkel (ohne Knochen)|4 EL Sojasauce|2 EL Mirin|1 EL Honig|1 TL Speisestärke|200 g Brokkoli|150 g Reis|1 TL Sesam',
    'Sojasauce, Mirin, Honig und Stärke verrühren.|Hähnchen auf der Hautseite knusprig braten, wenden und durchgaren.|Sauce zugeben und einkochen, bis das Fleisch glänzt.|Mit Reis, gedämpftem Brokkoli und Sesam servieren.');
  r('bibimbap', 'Bibimbap', 45, 2, 'bowl:karotte,spinat,eigelb',
    '150 g Reis|200 g Rinderhack|2 EL Sojasauce|1 Karotte|100 g Spinat|100 g Sojasprossen|1 Zucchini|2 Eier|2 EL Gochujang|1 TL Sesamöl',
    'Reis kochen. Hack mit Sojasauce krümelig braten.|Gemüse einzeln kurz anbraten oder blanchieren und mit Sesamöl würzen.|Spiegeleier braten.|Reis in Schalen geben, Gemüse und Hack darauf anrichten, Ei obenauf und mit Gochujang servieren.');
  r('pho-bo', 'Pho Bo (vietnamesische Nudelsuppe)', 60, 4, 'suppe:bruehe,nudel,kraut',
    '1.5 l Rinderbrühe|1 Zwiebel|30 g Ingwer|2 Stk Sternanis|1 Stk Zimtstange|3 EL Fischsauce|300 g Reisbandnudeln|300 g Rinderfilet|200 g Sojasprossen|1 Bund Thai-Basilikum|2 Limette',
    'Zwiebel und Ingwer halbieren und in einer Pfanne schwärzen.|Mit Brühe, Sternanis und Zimt 40 Minuten ziehen lassen, mit Fischsauce würzen und durchsieben.|Nudeln garen und auf Schalen verteilen, Rinderfilet hauchdünn darauflegen.|Mit kochender Brühe übergießen und mit Sprossen, Basilikum und Limette servieren.');
  r('suess-sauer', 'Hähnchen süß-sauer', 35, 4, 'teller:orange,paprika,reis',
    '500 g Hähnchenbrust|2 EL Speisestärke|1 Paprika|200 g Ananas|1 Zwiebel|4 EL Ketchup|3 EL Reisessig|2 EL Zucker|2 EL Sojasauce|250 g Reis',
    'Hähnchen würfeln, in Stärke wenden und knusprig braten.|Zwiebel, Paprika und Ananas kurz im Wok braten.|Ketchup, Essig, Zucker, Sojasauce und 100 ml Wasser verrühren und zugeben.|Hähnchen untermischen und mit Reis servieren.');

  kueche = 'Griechisch';
  r('moussaka', 'Moussaka', 100, 6, 'auflauf:creme,kruste,kraut',
    '3 Aubergine|500 g Lammhack|1 Zwiebel|2 Zehen Knoblauch|400 g Dosentomaten (gehackt)|1 TL Zimt|1 TL Oregano|50 g Butter|50 g Weizenmehl|500 ml Milch|1 Eier|60 g Kefalotyri oder Parmesan',
    'Auberginen in Scheiben schneiden, mit Öl bestreichen und im Ofen vorbacken.|Hack mit Zwiebel und Knoblauch braten, Tomaten, Zimt und Oregano zugeben und 15 Minuten köcheln.|Béchamel aus Butter, Mehl und Milch kochen, Ei und die Hälfte des Käses unterrühren.|Auberginen und Hack schichten, mit Béchamel und Käse abschließen und bei 180 °C 45 Minuten backen.');
  r('gyros-tzatziki', 'Gyros mit Tzatziki', 40, 4, 'teller:fleisch,joghurt,tomate',
    '600 g Schweinenacken|1 Zwiebel|2 TL Gyrosgewürz|3 EL Olivenöl|250 g Griechischer Joghurt|0.5 Gurke|2 Zehen Knoblauch|4 Stk Pita-Brote|2 Tomaten',
    'Fleisch in dünne Streifen schneiden und mit Zwiebelringen, Gewürz und Öl mindestens 2 Stunden marinieren.|Für das Tzatziki Gurke raspeln, ausdrücken und mit Joghurt und Knoblauch verrühren.|Fleisch portionsweise in einer heißen Pfanne knusprig braten.|Mit Pita, Tomaten und Tzatziki servieren.');
  r('souvlaki', 'Hähnchen-Souvlaki', 40, 4, 'spiesse:haehnchen,paprika,zwiebel',
    '600 g Hähnchenbrust|1 Zitrone|3 EL Olivenöl|2 Zehen Knoblauch|1 TL Oregano|1 Paprika|1 Stk rote Zwiebel|4 Stk Pita-Brote|200 g Tzatziki',
    'Hähnchen würfeln und mit Zitronensaft, Öl, Knoblauch und Oregano 1 Stunde marinieren.|Mit Paprika- und Zwiebelstücken auf Spieße stecken.|Auf dem Grill oder in der Grillpfanne rundum 10–12 Minuten braten.|Mit Pita und Tzatziki servieren.');
  r('briam', 'Briam (griechisches Ofengemüse)', 75, 4, 'auflauf:tomate,kartoffel,kraut',
    '500 g Kartoffeln|2 Zucchini|1 Aubergine|2 Paprika|2 Zwiebel|400 g Dosentomaten (gehackt)|80 ml Olivenöl|1 TL Oregano|1 Bund Petersilie|150 g Feta',
    'Gemüse in mundgerechte Stücke schneiden.|Mit Tomaten, Öl, Oregano und Petersilie in einer großen Form mischen, salzen und pfeffern.|Abgedeckt 30 Minuten, dann offen 30 Minuten bei 200 °C backen.|Mit zerbröseltem Feta servieren.');
  r('pastitsio', 'Pastitsio', 90, 6, 'auflauf:creme,nudel,kraut',
    '400 g Makkaroni|500 g Rinderhack|1 Zwiebel|400 g Dosentomaten (gehackt)|1 TL Zimt|60 g Butter|60 g Weizenmehl|700 ml Milch|2 Eier|100 g Parmesan',
    'Makkaroni bissfest kochen.|Hack mit Zwiebel braten, Tomaten und Zimt zugeben und 15 Minuten köcheln.|Béchamel kochen, Eier und Käse unterrühren.|Nudeln, Hack und Béchamel in eine Form schichten und 40 Minuten bei 180 °C goldbraun backen.');

  kueche = 'Orientalisch';
  r('falafel-teller', 'Falafel-Teller mit Hummus', 50, 4, 'kugeln:kraut,sesam,tomate',
    '250 g Getrocknete Kichererbsen|1 Zwiebel|2 Zehen Knoblauch|1 Bund Petersilie|1 TL Kreuzkümmel|1 TL Backpulver|500 ml Sonnenblumenöl|200 g Hummus|2 Tomaten|1 Gurke|4 Stk Fladenbrot',
    'Kichererbsen über Nacht einweichen, abtropfen lassen.|Mit Zwiebel, Knoblauch, Petersilie und Gewürzen fein mixen, Backpulver unterrühren.|Bällchen formen und im heißen Öl 3–4 Minuten frittieren.|Mit Hummus, Tomaten-Gurken-Salat und Fladenbrot servieren.');
  r('haehnchen-tajine', 'Hähnchen-Tajine mit Zitrone & Oliven', 70, 4, 'eintopf:curry,haehnchen,oliv',
    '8 Stk Hähnchenschenkel|2 Zwiebel|3 Zehen Knoblauch|1 TL Kurkuma|1 TL Ingwerpulver|1 Pck Safranfäden|2 Stk Salzzitronen|100 g Grüne Oliven|300 ml Hühnerbrühe|1 Bund Koriander|250 g Couscous',
    'Hähnchen rundum anbraten und herausnehmen.|Zwiebeln und Knoblauch mit den Gewürzen dünsten.|Hähnchen, Brühe und Salzzitronen zugeben und zugedeckt 45 Minuten schmoren.|Oliven zufügen, mit Koriander bestreuen und mit Couscous servieren.');
  r('koefte-bulgur', 'Köfte mit Bulgur & Joghurt', 40, 4, 'teller:hack,teig,joghurt',
    '500 g Lammhack|1 Zwiebel|1 Bund Petersilie|1 TL Kreuzkümmel|1 TL Paprikapulver|200 g Bulgur|1 EL Tomatenmark|400 ml Gemüsebrühe|200 g Naturjoghurt',
    'Hack mit geriebener Zwiebel, Petersilie und Gewürzen verkneten, längliche Köfte formen.|Köfte in der Pfanne oder auf dem Grill rundum braten.|Tomatenmark in Öl anrösten, Bulgur und Brühe zugeben und 15 Minuten quellen lassen.|Köfte mit Bulgur und Joghurt servieren.');
  r('mujaddara', 'Mujaddara (Linsen-Reis mit Röstzwiebeln)', 50, 4, 'teller:linse,zwiebel,joghurt',
    '200 g Braune Linsen|200 g Reis|4 Zwiebel|5 EL Olivenöl|1 TL Kreuzkümmel|1 TL Zimt|200 g Naturjoghurt',
    'Linsen 15 Minuten vorkochen.|Zwiebeln in Ringe schneiden und in Öl langsam dunkelbraun rösten.|Reis, Gewürze und die Hälfte der Zwiebeln zu den Linsen geben, Wasser auffüllen und 20 Minuten garen.|Mit restlichen Röstzwiebeln und Joghurt servieren.');
  r('lahmacun', 'Lahmacun', 60, 4, 'pizza:sosse,hack,kraut',
    '300 g Weizenmehl|7 g Trockenhefe|180 ml Wasser|250 g Rinderhack|1 Zwiebel|1 Paprika|2 EL Tomatenmark|1 TL Pul Biber|1 Bund Petersilie|1 Zitrone',
    'Mehl, Hefe, Wasser und Salz zu einem Teig kneten und 40 Minuten gehen lassen.|Hack mit sehr fein gehackter Zwiebel, Paprika, Tomatenmark und Gewürzen verkneten.|Teig in 4 sehr dünne Fladen ausrollen und hauchdünn mit der Hackmasse bestreichen.|Bei 250 °C 8 Minuten backen, mit Petersilie und Zitrone belegen und aufrollen.');

  kueche = 'Französisch';
  r('coq-au-vin', 'Coq au Vin', 110, 4, 'eintopf:rotwein,haehnchen,pilz',
    '1.2 kg Hähnchenteile|150 g Speckwürfel|200 g Champignons|12 Stk Perlzwiebeln|2 Zehen Knoblauch|1 EL Tomatenmark|750 ml Rotwein (Burgunder)|2 Stk Lorbeerblätter|4 Stk Thymianzweige|1 EL Weizenmehl',
    'Hähnchen salzen, rundum anbraten und herausnehmen.|Speck, Zwiebeln und Pilze im Bratfett bräunen, Knoblauch, Tomatenmark und Mehl kurz mitrösten.|Mit Wein ablöschen, Hähnchen und Kräuter zugeben und zugedeckt 75 Minuten schmoren.|Sauce bei Bedarf einkochen und mit Baguette oder Kartoffeln servieren.');
  r('ratatouille', 'Ratatouille', 60, 4, 'eintopf:tomate,aubergine,zucchini',
    '1 Aubergine|2 Zucchini|2 Paprika|2 Zwiebel|3 Zehen Knoblauch|400 g Dosentomaten (gehackt)|4 EL Olivenöl|1 TL Kräuter der Provence|0.5 Bund Basilikum',
    'Gemüse in gleich große Würfel schneiden.|Aubergine und Zucchini portionsweise in Öl anbraten.|Zwiebeln, Paprika und Knoblauch dünsten, Tomaten und Kräuter zugeben.|Alles zusammen 30 Minuten sanft schmoren, mit Basilikum servieren.');
  r('quiche-lorraine', 'Quiche Lorraine', 75, 6, 'torte:creme,keine,speck',
    '200 g Weizenmehl|100 g Butter|1 Eier|200 g Speckwürfel|1 Zwiebel|200 ml Sahne|200 ml Milch|3 Eier|150 g Gruyère|1 Prise Muskat',
    'Mehl, kalte Butter, 1 Ei und eine Prise Salz zu einem Mürbeteig verkneten und 30 Minuten kühlen.|Teig in eine Tarteform legen und 10 Minuten blind backen.|Speck und Zwiebel anbraten und auf dem Boden verteilen.|Sahne, Milch, Eier, Käse und Muskat verquirlen, darübergießen und bei 180 °C 35 Minuten backen.');
  r('boeuf-bourguignon', 'Bœuf bourguignon', 180, 6, 'eintopf:rotwein,fleisch,karotte',
    '1.2 kg Rindergulasch|150 g Speckwürfel|2 Karotten|1 Zwiebel|2 Zehen Knoblauch|2 EL Tomatenmark|750 ml Rotwein|300 ml Rinderfond|250 g Champignons|12 Stk Perlzwiebeln|1 Bund Thymian',
    'Fleisch portionsweise scharf anbraten.|Speck, Karotten, Zwiebel und Knoblauch anbraten, Tomatenmark mitrösten.|Mit Wein und Fond ablöschen, Fleisch und Thymian zugeben und 2,5 Stunden schmoren.|Pilze und Perlzwiebeln anbraten und die letzten 20 Minuten mitgaren.');
  r('zwiebelsuppe', 'Französische Zwiebelsuppe', 70, 4, 'suppe:karamell,brot,kaese',
    '1 kg Zwiebel|40 g Butter|1 EL Weizenmehl|150 ml Weißwein|1.2 l Rinderbrühe|1 Stk Baguette|150 g Gruyère',
    'Zwiebeln in Ringe schneiden und in Butter 40 Minuten langsam karamellisieren.|Mehl darüberstäuben, mit Wein ablöschen und Brühe zugeben, 15 Minuten köcheln.|Suppe in ofenfeste Schalen füllen, mit Baguettescheiben und Käse belegen.|Unter dem Grill goldbraun überbacken.');
  r('flammkuchen', 'Elsässer Flammkuchen', 35, 2, 'pizza:creme,speck,zwiebel',
    '250 g Weizenmehl|150 ml Wasser|2 EL Olivenöl|200 g Schmand|150 g Speckwürfel|2 Zwiebel|1 Prise Muskat',
    'Mehl, Wasser, Öl und Salz zu einem glatten Teig kneten (ohne Hefe).|Sehr dünn ausrollen und auf ein Backpapier legen.|Mit gewürztem Schmand bestreichen, Speck und Zwiebelringe darauf verteilen.|Bei 250 °C 10–12 Minuten knusprig backen.');

  kueche = 'Spanisch';
  r('paella', 'Paella mit Meeresfrüchten', 60, 4, 'teller:curry,garnele,zitrone',
    '300 g Paella-Reis|1 Zwiebel|2 Zehen Knoblauch|1 Paprika|1 Pck Safranfäden|1 TL Paprikapulver (geräuchert)|900 ml Fischfond|300 g Garnelen|300 g Miesmuscheln|150 g Erbsen (TK)|1 Zitrone',
    'Zwiebel, Knoblauch und Paprika in Öl in einer großen Pfanne dünsten.|Reis, Safran und Paprikapulver zugeben und kurz anrösten.|Fond angießen und 15 Minuten ohne Rühren köcheln.|Garnelen, Muscheln und Erbsen darauf verteilen und 10 Minuten garen. Mit Zitrone servieren.');
  r('tortilla-espanola', 'Tortilla de patatas', 45, 4, 'torte:kartoffel,keine,kraut',
    '600 g Kartoffeln (festkochend)|1 Zwiebel|6 Eier|150 ml Olivenöl|Salz',
    'Kartoffeln und Zwiebel in dünne Scheiben schneiden und im Öl bei mittlerer Hitze 20 Minuten weich garen.|Abgießen (Öl auffangen) und mit verquirlten, gesalzenen Eiern mischen.|In einer Pfanne mit etwas Öl bei kleiner Hitze stocken lassen.|Mit Hilfe eines Tellers wenden und die zweite Seite fertig garen.');
  r('gazpacho', 'Gazpacho', 20, 4, 'suppe:tomate,gurke,brot',
    '1 kg Tomaten|1 Gurke|1 Paprika|1 Zehen Knoblauch|50 g Weißbrot|4 EL Olivenöl|2 EL Sherryessig|Salz',
    'Gemüse grob würfeln, Brot einweichen.|Alles mit Öl und Essig fein pürieren und salzen.|Mindestens 2 Stunden kalt stellen.|Mit Gurken- und Paprikawürfeln und Croûtons servieren.');
  r('albondigas', 'Albóndigas in Tomatensauce', 50, 4, 'kugeln:hack,tomate,kraut',
    '500 g Gemischtes Hackfleisch|1 Zwiebel|2 Zehen Knoblauch|1 Eier|50 g Paniermehl|1 TL Paprikapulver (geräuchert)|400 g Dosentomaten (gehackt)|100 ml Weißwein|0.5 Bund Petersilie',
    'Hack mit der Hälfte der Zwiebel, Knoblauch, Ei, Paniermehl und Gewürzen verkneten.|Kleine Bällchen formen und rundum anbraten.|Restliche Zwiebel andünsten, mit Wein ablöschen, Tomaten zugeben.|Albóndigas in der Sauce 20 Minuten köcheln, mit Petersilie bestreuen.');
  r('pollo-al-ajillo', 'Pollo al ajillo (Knoblauchhähnchen)', 45, 4, 'teller:haehnchen,kartoffel,kraut',
    '1 kg Hähnchenschenkel|1 Stk Knoblauchknolle|100 ml Olivenöl|150 ml Weißwein|2 Stk Lorbeerblätter|1 Bund Petersilie|800 g Kartoffeln',
    'Hähnchen in Stücke teilen, salzen und im Öl rundum goldbraun braten.|Ungeschälte Knoblauchzehen und Lorbeer zugeben und 5 Minuten mitbraten.|Mit Wein ablöschen und zugedeckt 25 Minuten schmoren.|Mit Petersilie bestreuen und mit Bratkartoffeln servieren.');

  kueche = 'Amerikanisch';
  r('cheeseburger', 'Klassischer Cheeseburger', 30, 4, 'burger:hack,kaese,tomate',
    '600 g Rinderhack|4 Stk Burger-Brötchen|4 Stk Cheddar (Scheiben)|1 Tomaten|1 Stk rote Zwiebel|4 Stk Salatblätter|4 EL Burgersauce|2 Stk Gewürzgurken',
    'Hack salzen, pfeffern und zu 4 flachen Patties formen.|In einer heißen Pfanne 3–4 Minuten pro Seite braten, zuletzt mit Cheddar belegen und schmelzen lassen.|Brötchen anrösten und mit Sauce bestreichen.|Mit Salat, Tomate, Zwiebel, Gurke und Patty belegen.');
  r('mac-and-cheese', 'Mac and Cheese', 40, 4, 'auflauf:kaese,kruste,keine',
    '400 g Makkaroni|40 g Butter|40 g Weizenmehl|600 ml Milch|250 g Cheddar|1 TL Senf|50 g Paniermehl',
    'Makkaroni bissfest kochen.|Butter und Mehl anschwitzen, Milch einrühren und 5 Minuten köcheln.|Käse und Senf in der Sauce schmelzen und mit den Nudeln mischen.|In eine Form geben, mit Paniermehl bestreuen und bei 200 °C 15 Minuten überbacken.');
  r('pulled-pork', 'Pulled-Pork-Burger mit Coleslaw', 300, 6, 'burger:fleisch,karotte,kraut',
    '1.5 kg Schweineschulter (ohne Knochen)|3 EL BBQ-Rub|300 ml BBQ-Sauce|6 Stk Burger-Brötchen|300 g Weißkohl|1 Karotte|4 EL Mayonnaise|1 EL Apfelessig',
    'Fleisch mit dem Rub einreiben und abgedeckt bei 130 °C 5 Stunden garen.|Für den Coleslaw Kohl und Karotte fein hobeln und mit Mayonnaise und Essig mischen.|Fleisch mit zwei Gabeln zerzupfen und mit BBQ-Sauce mischen.|Brötchen mit Pulled Pork und Coleslaw füllen.');
  r('jambalaya', 'Jambalaya', 50, 4, 'teller:tomate,wurst,garnele',
    '250 g Langkornreis|200 g Hähnchenbrust|200 g Chorizo|200 g Garnelen|1 Zwiebel|1 Paprika|2 Stk Stangensellerie|400 g Dosentomaten (gehackt)|500 ml Hühnerbrühe|2 TL Cajun-Gewürz',
    'Chorizo und Hähnchen würfeln und anbraten.|Zwiebel, Paprika und Sellerie zugeben und weich dünsten.|Reis, Gewürz, Tomaten und Brühe zugeben und zugedeckt 20 Minuten garen.|Garnelen unterheben und 5 Minuten mitgaren.');
  r('meatloaf', 'Meatloaf mit Kartoffelpüree', 80, 6, 'brot:hack,keine',
    '800 g Rinderhack|1 Zwiebel|2 Eier|60 g Paniermehl|100 ml Milch|1 TL Worcestersauce|100 g Ketchup|1 EL Brauner Zucker|1 kg Kartoffeln|40 g Butter',
    'Hack mit Zwiebelwürfeln, Eiern, Paniermehl, Milch und Worcestersauce verkneten.|Zu einem Laib formen und in eine Kastenform drücken.|Ketchup mit Zucker verrühren, aufstreichen und bei 180 °C 60 Minuten backen.|Kartoffeln kochen und mit Butter zu Püree stampfen, Meatloaf in Scheiben dazu servieren.');
  r('clam-chowder', 'New England Clam Chowder', 45, 4, 'suppe:sahne,kartoffel,speck',
    '100 g Speckwürfel|1 Zwiebel|2 Stk Stangensellerie|500 g Kartoffeln|500 ml Fischfond|300 g Venusmuscheln (Dose)|250 ml Sahne|1 Bund Petersilie',
    'Speck auslassen, Zwiebel und Sellerie darin dünsten.|Kartoffelwürfel und Fond zugeben und 15 Minuten garen.|Muscheln mit Saft und Sahne zugeben und 5 Minuten ziehen lassen.|Mit Petersilie und Crackern servieren.');

  kueche = 'International';
  r('chili-cheese-ofenkartoffel', 'Gefüllte Ofenkartoffeln', 70, 4, 'teller:kartoffel,creme,kraut',
    '4 Stk Große Kartoffeln|150 g Kräuterquark|100 g Gouda / Schnittkäse|100 g Schinkenwürfel|2 Stk Frühlingszwiebeln',
    'Kartoffeln waschen, einstechen und bei 200 °C 60 Minuten backen.|Aufschneiden und etwas Fruchtfleisch herauslösen.|Mit Schinken und Käse mischen, wieder einfüllen und 10 Minuten überbacken.|Mit Kräuterquark und Frühlingszwiebeln servieren.');
  r('buddha-bowl', 'Buddha-Bowl mit Erdnusssauce', 35, 2, 'bowl:kuerbis,avocado,lila',
    '120 g Quinoa|1 Süßkartoffel|200 g Rotkohl|1 Avocado|150 g Edamame (TK)|2 EL Erdnussmus|1 EL Sojasauce|1 Limette',
    'Quinoa kochen, Süßkartoffelwürfel bei 200 °C 25 Minuten rösten.|Rotkohl fein hobeln, Avocado schneiden, Edamame garen.|Erdnussmus mit Sojasauce, Limettensaft und Wasser glatt rühren.|Alles in Schalen anrichten und mit der Sauce beträufeln.');

  /* ==================== Backen ==================== */
  kat = 'Backen';
  kueche = '';
  r('apfelkuchen', 'Gedeckter Apfelkuchen', 90, 12, 'torte:apfel,kruste,zimt',
    '400 g Weizenmehl|200 g Butter|120 g Zucker|1 Pck Vanillezucker|1 Eier|1 TL Backpulver|1.2 kg Aepfel|1 Zitrone|1 TL Zimt|50 g Rosinen|1 EL Puderzucker',
    'Mehl, Backpulver, Butter, Zucker, Vanillezucker und Ei zu einem Mürbeteig kneten und 30 Minuten kühlen.|Äpfel schälen, in Scheiben schneiden und mit Zitronensaft, Zimt und Rosinen mischen.|Zwei Drittel des Teigs in eine Springform mit Rand drücken, Äpfel einfüllen und mit dem restlichen Teig abdecken.|Bei 180 °C 50 Minuten backen und mit Puderzucker bestäuben.');
  r('kaesekuchen', 'Klassischer Käsekuchen', 100, 12, 'kuchen:vanille,kruste,vanille',
    '200 g Weizenmehl|80 g Zucker|100 g Butter|1 Eier|1 kg Magerquark|200 g Zucker|4 Eier|1 Pck Vanillepuddingpulver|200 ml Sahne|1 Zitrone',
    'Mehl, 80 g Zucker, Butter und 1 Ei zu einem Mürbeteig verkneten und in eine Springform drücken.|Quark mit Zucker, Eiern, Puddingpulver, Sahne und Zitronenabrieb glatt rühren.|Masse auf den Boden geben und bei 160 °C 70 Minuten backen.|Im ausgeschalteten Ofen bei leicht geöffneter Tür abkühlen lassen.');
  r('bananenbrot', 'Saftiges Bananenbrot', 70, 12, 'brot:kruste,banane',
    '3 Banane (sehr reif)|80 g Butter|100 g Brauner Zucker|2 Eier|220 g Weizenmehl|1 TL Natron|1 TL Zimt|60 g Walnüsse',
    'Bananen zerdrücken, mit geschmolzener Butter, Zucker und Eiern verrühren.|Mehl, Natron und Zimt unterheben, gehackte Walnüsse zugeben.|Teig in eine gefettete Kastenform füllen.|Bei 175 °C 55 Minuten backen (Stäbchenprobe).');
  r('brownies', 'Schoko-Brownies', 45, 16, 'stuecke:schoko,keine,nuss',
    '200 g Zartbitterschokolade|150 g Butter|200 g Zucker|3 Eier|100 g Weizenmehl|2 EL Kakao|1 Prise Salz|80 g Walnüsse',
    'Schokolade und Butter schmelzen und etwas abkühlen lassen.|Eier mit Zucker schaumig schlagen und die Schokobutter unterrühren.|Mehl, Kakao, Salz und gehackte Nüsse unterheben.|In einer eckigen Form bei 180 °C 22–25 Minuten backen – innen sollen sie noch feucht sein.');
  r('schokomuffins', 'Schokomuffins', 35, 12, 'muffin:schoko,sahne,keine',
    '250 g Weizenmehl|30 g Kakao|2 TL Backpulver|150 g Zucker|2 Eier|250 ml Milch|100 ml Sonnenblumenöl|100 g Schokotropfen',
    'Mehl, Kakao, Backpulver und Zucker mischen.|Eier, Milch und Öl verquirlen und kurz unterrühren.|Schokotropfen unterheben, Teig in 12 Muffinförmchen füllen.|Bei 180 °C 20–22 Minuten backen.');
  r('blaubeermuffins', 'Blaubeer-Muffins', 35, 12, 'muffin:teig,blaubeere,keine',
    '280 g Weizenmehl|2 TL Backpulver|130 g Zucker|1 Pck Vanillezucker|2 Eier|200 g Naturjoghurt|100 ml Sonnenblumenöl|200 g Blaubeeren',
    'Trockene Zutaten mischen.|Eier, Joghurt und Öl verquirlen und kurz unterrühren.|Blaubeeren vorsichtig unterheben und den Teig in Förmchen füllen.|Bei 180 °C 22 Minuten goldbraun backen.');
  r('zimtschnecken', 'Zimtschnecken', 120, 12, 'schnecken:teig,zimt,sahne',
    '500 g Weizenmehl|1 Pck Trockenhefe|250 ml Milch|80 g Zucker|1 Eier|80 g Butter|100 g Brauner Zucker|2 EL Zimt|80 g Butter (weich)|100 g Puderzucker',
    'Mehl, Hefe, lauwarme Milch, Zucker, Ei und Butter zu einem glatten Teig kneten und 1 Stunde gehen lassen.|Teig rechteckig ausrollen, mit weicher Butter bestreichen und mit Zimtzucker bestreuen.|Aufrollen, in 12 Scheiben schneiden, in eine Form setzen und 30 Minuten gehen lassen.|Bei 180 °C 25 Minuten backen und mit Zuckerguss bestreichen.');
  r('marmorkuchen', 'Marmorkuchen', 75, 16, 'kuchen:vanille,schoko,schoko',
    '250 g Butter|200 g Zucker|1 Pck Vanillezucker|4 Eier|375 g Weizenmehl|1 Pck Backpulver|125 ml Milch|2 EL Kakao|2 EL Milch',
    'Butter mit Zucker und Vanillezucker cremig rühren, Eier einzeln unterrühren.|Mehl und Backpulver abwechselnd mit der Milch unterrühren.|Ein Drittel des Teigs mit Kakao und 2 EL Milch verrühren.|Hellen und dunklen Teig in eine Gugelhupfform schichten, mit einer Gabel marmorieren und bei 175 °C 55 Minuten backen.');
  r('zitronenkuchen', 'Zitronenkuchen mit Guss', 70, 12, 'kuchen:vanille,zitrone,zucker',
    '250 g Butter|220 g Zucker|4 Eier|2 Zitrone|300 g Weizenmehl|1 Pck Backpulver|150 g Puderzucker',
    'Butter und Zucker schaumig schlagen, Eier und Zitronenabrieb unterrühren.|Mehl mit Backpulver und den Saft einer Zitrone unterrühren.|In einer Kastenform bei 175 °C 55 Minuten backen.|Puderzucker mit Zitronensaft verrühren und über den noch warmen Kuchen geben.');
  r('karottenkuchen', 'Karottenkuchen mit Frischkäse-Frosting', 80, 12, 'kuchen:karotte,sahne,nuss',
    '300 g Karotten|200 g Brauner Zucker|3 Eier|180 ml Sonnenblumenöl|250 g Weizenmehl|1 TL Natron|1 TL Backpulver|2 TL Zimt|100 g Walnüsse|200 g Frischkäse|80 g Puderzucker|50 g Butter',
    'Karotten fein raspeln.|Eier, Zucker und Öl verrühren, Mehl, Natron, Backpulver und Zimt unterheben.|Karotten und gehackte Nüsse unterrühren und in einer Springform bei 175 °C 50 Minuten backen.|Frischkäse mit Butter und Puderzucker aufschlagen und auf den abgekühlten Kuchen streichen.');
  r('schwarzwaelder', 'Schwarzwälder Kirschtorte', 150, 16, 'kuchen:schoko,sahne,kirsche',
    '6 Eier|200 g Zucker|120 g Weizenmehl|50 g Speisestärke|40 g Kakao|1 TL Backpulver|720 g Sauerkirschen (Glas)|2 EL Speisestärke|4 EL Kirschwasser|800 ml Sahne|2 Pck Sahnesteif|50 g Schokoraspel',
    'Eier und Zucker sehr schaumig schlagen, Mehl, Stärke, Kakao und Backpulver unterheben und bei 175 °C 30 Minuten backen.|Kirschen mit Saft und Stärke andicken, abkühlen lassen.|Boden zweimal waagerecht teilen und mit Kirschwasser beträufeln.|Böden mit Kirschen und geschlagener Sahne schichten, rundum mit Sahne einstreichen, mit Schokoraspeln und Kirschen verzieren.');
  r('streuselkuchen', 'Streuselkuchen vom Blech', 90, 20, 'stuecke:teig,vanille,keine',
    '500 g Weizenmehl|1 Pck Trockenhefe|200 ml Milch|60 g Zucker|1 Eier|60 g Butter|300 g Weizenmehl|200 g Zucker|200 g Butter|1 TL Zimt',
    'Aus Mehl, Hefe, lauwarmer Milch, Zucker, Ei und Butter einen Hefeteig kneten und 45 Minuten gehen lassen.|Teig auf ein Blech rollen.|Für die Streusel Mehl, Zucker, kalte Butter und Zimt zwischen den Fingern verkrümeln und darauf verteilen.|Nochmals 15 Minuten gehen lassen und bei 180 °C 25 Minuten backen.');
  r('butterkuchen', 'Butterkuchen', 80, 20, 'stuecke:teig,karamell,nuss',
    '500 g Weizenmehl|1 Pck Trockenhefe|250 ml Milch|80 g Zucker|1 Eier|80 g Butter|150 g Butter (kalt)|150 g Zucker|100 g Mandelblättchen',
    'Hefeteig aus Mehl, Hefe, Milch, Zucker, Ei und Butter kneten und 45 Minuten gehen lassen.|Auf ein Blech ausrollen, nochmals 15 Minuten gehen lassen.|Mit dem Finger Mulden drücken, Butterflöckchen hineinsetzen und mit Zucker und Mandeln bestreuen.|Bei 200 °C 15–20 Minuten goldgelb backen.');
  r('hefezopf', 'Hefezopf', 120, 12, 'brot:kruste,sesam',
    '500 g Weizenmehl|1 Pck Trockenhefe|200 ml Milch|70 g Zucker|1 Prise Salz|80 g Butter|1 Eier|1 Eigelb|2 EL Hagelzucker',
    'Alle Zutaten außer Eigelb und Hagelzucker 10 Minuten zu einem geschmeidigen Teig kneten.|Abgedeckt 1 Stunde gehen lassen.|In drei Stränge teilen, zu einem Zopf flechten und weitere 30 Minuten gehen lassen.|Mit Eigelb bestreichen, mit Hagelzucker bestreuen und bei 180 °C 30 Minuten backen.');
  r('broetchen', 'Knusprige Sonntagsbrötchen', 150, 10, 'broetchen:kruste,keine',
    '500 g Weizenmehl (Typ 550)|10 g Salz|5 g Trockenhefe|330 ml Wasser|1 TL Honig',
    'Alle Zutaten 10 Minuten kneten und abgedeckt über Nacht im Kühlschrank gehen lassen.|Teig in 10 Stücke teilen, rund schleifen und 45 Minuten gehen lassen.|Oberfläche einschneiden und mit Wasser besprühen.|Bei 230 °C mit einer Schale Wasser im Ofen 20 Minuten knusprig backen.');
  r('vollkornbrot', 'Dinkel-Vollkornbrot', 90, 20, 'brot:brot,sesam',
    '500 g Dinkelvollkornmehl|1 Pck Trockenhefe|500 ml Wasser (lauwarm)|2 TL Salz|2 EL Apfelessig|100 g Sonnenblumenkerne|50 g Leinsamen',
    'Alle Zutaten zu einem feuchten Teig verrühren (nicht kneten).|In eine gefettete Kastenform füllen und mit Kernen bestreuen.|In den kalten Ofen stellen und bei 200 °C 60 Minuten backen.|Aus der Form lösen und auf einem Gitter auskühlen lassen.');
  r('focaccia', 'Rosmarin-Focaccia', 180, 8, 'stuecke:teig,oliv,kraut',
    '500 g Weizenmehl|7 g Trockenhefe|400 ml Wasser|10 g Salz|80 ml Olivenöl|2 Stk Rosmarinzweige|1 TL Meersalz|100 g Kirschtomaten',
    'Mehl, Hefe, Wasser und Salz verrühren und 2 Stunden gehen lassen, dabei zweimal falten.|Teig in eine geölte Form geben und ausbreiten.|Mit den Fingern Mulden drücken, Tomaten und Rosmarin hineinsetzen, großzügig mit Öl beträufeln und Meersalz bestreuen.|Bei 220 °C 25 Minuten goldbraun backen.');
  r('laugenbrezeln', 'Laugenbrezeln', 90, 8, 'brezel:kakao,zucker',
    '500 g Weizenmehl|10 g Salz|7 g Trockenhefe|280 ml Wasser|40 g Butter|1 l Wasser|4 EL Natron|1 EL Hagelsalz',
    'Mehl, Salz, Hefe, Wasser und Butter zu einem festen Teig kneten und 45 Minuten gehen lassen.|8 Stränge rollen (Mitte dicker), zu Brezeln schlingen und 15 Minuten offen kühlen.|Natron in kochendem Wasser lösen und die Brezeln 30 Sekunden darin baden.|Dick einschneiden, mit Hagelsalz bestreuen und bei 220 °C 15–18 Minuten backen.');
  r('cookies', 'Chocolate Chip Cookies', 30, 20, 'kekse:teig,schoko',
    '125 g Butter|100 g Brauner Zucker|50 g Zucker|1 Eier|1 Pck Vanillezucker|200 g Weizenmehl|0.5 TL Natron|1 Prise Salz|150 g Schokotropfen',
    'Butter mit beiden Zuckersorten cremig rühren, Ei und Vanillezucker unterrühren.|Mehl, Natron und Salz unterheben, Schokotropfen zugeben.|Walnussgroße Kugeln mit Abstand aufs Blech setzen.|Bei 180 °C 10–12 Minuten backen – sie werden beim Abkühlen fest.');
  r('vanillekipferl', 'Vanillekipferl', 60, 40, 'kekse:vanille,zucker',
    '250 g Weizenmehl|100 g Gemahlene Mandeln|80 g Zucker|200 g Butter|2 Eigelb|3 Pck Vanillezucker|80 g Puderzucker',
    'Mehl, Mandeln, Zucker, Butter und Eigelb zu einem Mürbeteig verkneten und 30 Minuten kühlen.|Kleine Rollen formen und zu Hörnchen biegen.|Bei 175 °C 10–12 Minuten hell backen.|Noch warm in Vanillezucker und Puderzucker wälzen.');
  r('scones', 'Englische Scones', 30, 8, 'broetchen:teig,erdbeere',
    '300 g Weizenmehl|1 Pck Backpulver|40 g Zucker|1 Prise Salz|80 g Butter (kalt)|150 ml Milch|1 Eier|150 g Clotted Cream|150 g Erdbeermarmelade',
    'Mehl, Backpulver, Zucker und Salz mischen, kalte Butter einkrümeln.|Milch und Ei zugeben und nur kurz zu einem Teig zusammenfügen.|3 cm dick ausrollen, Kreise ausstechen und mit Milch bestreichen.|Bei 220 °C 12–15 Minuten backen, mit Clotted Cream und Marmelade servieren.');
  r('donauwelle', 'Donauwelle', 120, 20, 'stuecke:vanille,schoko,kirsche',
    '250 g Butter|200 g Zucker|5 Eier|375 g Weizenmehl|1 Pck Backpulver|2 EL Kakao|720 g Sauerkirschen (Glas)|1 Pck Vanillepuddingpulver|500 ml Milch|200 g Butter (weich)|200 g Zartbitterkuvertüre',
    'Rührteig herstellen, die Hälfte aufs Blech streichen, die andere Hälfte mit Kakao verrühren und darauf verteilen.|Abgetropfte Kirschen darauflegen und bei 175 °C 30 Minuten backen.|Pudding kochen und abkühlen lassen, mit weicher Butter zu einer Creme aufschlagen und aufstreichen.|Mit geschmolzener Kuvertüre überziehen und mit einer Gabel Wellen ziehen.');
  r('erdbeerkuchen', 'Erdbeerkuchen mit Biskuitboden', 60, 12, 'torte:vanille,keine,erdbeere',
    '3 Eier|100 g Zucker|100 g Weizenmehl|1 TL Backpulver|1 Pck Vanillepuddingpulver|500 ml Milch|750 g Erdbeeren|1 Pck Tortenguss (rot)',
    'Eier und Zucker dick-cremig aufschlagen, Mehl und Backpulver unterheben und in einer Obstbodenform bei 180 °C 15 Minuten backen.|Pudding nach Packung kochen und auf den abgekühlten Boden streichen.|Erdbeeren halbieren und dicht darauflegen.|Tortenguss zubereiten und über die Erdbeeren geben.');
  r('zwetschgendatschi', 'Zwetschgendatschi', 100, 20, 'stuecke:pflaume,keine,zimt',
    '400 g Weizenmehl|1 Pck Trockenhefe|200 ml Milch|50 g Zucker|1 Eier|50 g Butter|1.5 kg Zwetschgen|2 EL Zimtzucker',
    'Hefeteig aus Mehl, Hefe, Milch, Zucker, Ei und Butter kneten und 45 Minuten gehen lassen.|Zwetschgen entsteinen und vierteln.|Teig aufs Blech rollen und die Zwetschgen dachziegelartig dicht darauflegen.|Bei 190 °C 30 Minuten backen und mit Zimtzucker bestreuen.');
  r('baguette', 'Französisches Baguette', 240, 3, 'brot:kruste,keine',
    '500 g Weizenmehl (Typ 550)|350 ml Wasser|10 g Salz|3 g Trockenhefe',
    'Alle Zutaten verrühren und 3 Stunden gehen lassen, dabei stündlich dehnen und falten.|Teig in 3 Stücke teilen und vorsichtig zu langen Stangen formen.|30 Minuten auf einem Tuch gehen lassen, schräg einschneiden.|Bei 250 °C mit Dampf 20–25 Minuten knusprig backen.');
  r('pizzaschnecken', 'Pizzaschnecken', 50, 16, 'schnecken:teig,tomate,kaese',
    '1 Pck Pizzateig (Kühlregal)|150 g Passierte Tomaten|1 TL Oregano|100 g Kochschinken|1 Paprika|150 g Gouda / Schnittkäse',
    'Teig ausrollen und mit gewürzten Tomaten bestreichen.|Mit Schinken- und Paprikawürfeln und geriebenem Käse bestreuen.|Von der langen Seite aufrollen und in 2 cm dicke Scheiben schneiden.|Auf ein Blech legen und bei 200 °C 15–18 Minuten backen.');
  r('linzer-torte', 'Linzer Torte', 80, 12, 'torte:himbeere,kruste,keine',
    '200 g Weizenmehl|200 g Gemahlene Haselnüsse|150 g Zucker|200 g Butter|1 Eier|1 TL Zimt|1 Prise Nelken|300 g Himbeermarmelade',
    'Mehl, Nüsse, Zucker, Butter, Ei und Gewürze zu einem Teig verkneten und 30 Minuten kühlen.|Zwei Drittel in eine Tarteform drücken und mit Marmelade bestreichen.|Restlichen Teig zu Streifen rollen und als Gitter darüberlegen.|Bei 175 °C 40 Minuten backen.');
  r('bienenstich', 'Bienenstich', 120, 16, 'kuchen:teig,vanille,karamell',
    '400 g Weizenmehl|1 Pck Trockenhefe|200 ml Milch|50 g Zucker|1 Eier|60 g Butter|100 g Butter|100 g Zucker|2 EL Honig|150 g Mandelblättchen|1 Pck Vanillepuddingpulver|500 ml Milch|200 ml Sahne',
    'Hefeteig kneten, in eine Springform drücken und 30 Minuten gehen lassen.|Butter, Zucker und Honig aufkochen, Mandeln unterrühren und auf den Teig streichen.|Bei 180 °C 25 Minuten backen und abkühlen lassen.|Pudding kochen, abkühlen, Sahne steif unterheben; Kuchen waagerecht halbieren und mit der Creme füllen.');
  r('madeleines', 'Madeleines', 40, 24, 'kekse:kruste,zucker',
    '2 Eier|100 g Zucker|1 Zitrone|100 g Weizenmehl|1 TL Backpulver|100 g Butter',
    'Eier und Zucker schaumig schlagen, Zitronenabrieb zugeben.|Mehl und Backpulver unterheben, geschmolzene Butter einrühren.|Teig 1 Stunde kühlen, dann in gefettete Madeleine-Förmchen füllen.|Bei 200 °C 8–10 Minuten backen, bis sie ihren typischen Buckel haben.');
  r('zupfkuchen', 'Russischer Zupfkuchen', 100, 12, 'kuchen:vanille,schoko,schoko',
    '300 g Weizenmehl|30 g Kakao|200 g Zucker|200 g Butter|1 Eier|1 TL Backpulver|500 g Magerquark|150 g Zucker|3 Eier|1 Pck Vanillepuddingpulver|125 g Butter (geschmolzen)',
    'Mehl, Kakao, Zucker, Butter, Ei und Backpulver zu einem Schokomürbeteig verkneten.|Zwei Drittel in eine Springform drücken, mit Rand.|Quark, Zucker, Eier, Puddingpulver und geschmolzene Butter verrühren und einfüllen.|Restlichen Teig in Stücken darauf zupfen und bei 175 °C 60 Minuten backen.');
  r('spanakopita', 'Spanakopita (Spinat-Feta-Strudel)', 60, 8, 'stuecke:kruste,spinat,keine',
    '1 Pck Filoteig|500 g Spinat|200 g Feta|2 Eier|1 Zwiebel|1 Bund Dill|80 g Butter (geschmolzen)',
    'Spinat mit Zwiebel dünsten, gut ausdrücken und mit Feta, Eiern und Dill mischen.|Filoblätter einzeln mit Butter bestreichen und die Hälfte in eine Form schichten.|Füllung verteilen und mit den restlichen gebutterten Blättern abdecken.|In Stücke vorschneiden und bei 180 °C 40 Minuten goldbraun backen.');

  /* ==================== Nachtisch ==================== */
  kat = 'Nachtisch';
  r('tiramisu', 'Tiramisu', 30, 8, 'stuecke:creme,kakao,kakao',
    '500 g Mascarpone|4 Eier (sehr frisch)|100 g Zucker|200 g Löffelbiskuits|300 ml Espresso (kalt)|3 EL Amaretto|2 EL Kakao',
    'Eigelb mit Zucker cremig schlagen, Mascarpone unterrühren.|Eiweiß steif schlagen und unterheben.|Löffelbiskuits kurz in Espresso mit Amaretto tauchen und abwechselnd mit der Creme in eine Form schichten.|Mindestens 4 Stunden kühlen und vor dem Servieren mit Kakao bestäuben.');
  r('panna-cotta', 'Panna Cotta mit Beerensoße', 20, 4, 'pudding:sahne,himbeere,blaubeere',
    '500 ml Sahne|60 g Zucker|1 Stk Vanilleschote|4 Stk Gelatineblätter|250 g Beeren (TK-Mix)|2 EL Puderzucker',
    'Gelatine einweichen. Sahne mit Zucker und Vanillemark aufkochen und 5 Minuten köcheln.|Vom Herd nehmen, ausgedrückte Gelatine darin auflösen.|In Förmchen füllen und mindestens 4 Stunden kühlen.|Beeren mit Puderzucker pürieren und zur gestürzten Panna Cotta reichen.');
  r('mousse-au-chocolat', 'Mousse au Chocolat', 25, 6, 'dessert:schoko,kakao,sahne',
    '200 g Zartbitterschokolade|4 Eier|40 g Zucker|200 ml Sahne|1 Prise Salz',
    'Schokolade über dem Wasserbad schmelzen und etwas abkühlen lassen.|Eigelb mit der Hälfte des Zuckers schaumig schlagen, Schokolade unterrühren.|Sahne steif schlagen, Eiweiß mit Salz und restlichem Zucker steif schlagen.|Erst Sahne, dann Eischnee unterheben und mindestens 4 Stunden kühlen.');
  r('creme-brulee', 'Crème brûlée', 60, 4, 'pudding:vanille,karamell,keine',
    '400 ml Sahne|100 ml Milch|1 Stk Vanilleschote|5 Eigelb|70 g Zucker|4 EL Brauner Zucker',
    'Sahne und Milch mit Vanille erhitzen.|Eigelb mit Zucker verrühren und die warme Sahne langsam unterrühren.|In flache Förmchen füllen und im Wasserbad bei 150 °C 35 Minuten stocken lassen, dann kühlen.|Mit braunem Zucker bestreuen und mit dem Flambierbrenner karamellisieren.');
  r('kaiserschmarrn', 'Kaiserschmarrn', 25, 2, 'teller:teig,pflaume,zucker',
    '4 Eier|125 g Weizenmehl|250 ml Milch|2 EL Zucker|1 Prise Salz|40 g Rosinen|30 g Butter|2 EL Puderzucker|200 g Zwetschgenröster',
    'Eier trennen. Eigelb mit Mehl, Milch und Salz glatt rühren, Eiweiß mit Zucker steif schlagen und unterheben.|Teig in heiße Butter gießen, Rosinen darüberstreuen und anbacken lassen.|Wenden, mit zwei Gabeln in Stücke reißen und mit etwas Zucker karamellisieren.|Mit Puderzucker und Zwetschgenröster servieren.');
  r('milchreis', 'Milchreis mit Zimt & Zucker', 40, 4, 'suppe:reis,zimt,kirsche',
    '1 l Milch|200 g Milchreis|50 g Zucker|1 Pck Vanillezucker|1 Prise Salz|2 EL Zimtzucker',
    'Milch mit Zucker, Vanillezucker und Salz aufkochen.|Reis einrühren und bei kleinster Hitze 30 Minuten quellen lassen, gelegentlich umrühren.|Warm oder kalt mit Zimtzucker servieren.');
  r('rote-gruetze', 'Rote Grütze mit Vanillesoße', 25, 6, 'dessert:beere,vanille,minze',
    '500 g Beeren (TK-Mix)|250 ml Kirschsaft|60 g Zucker|3 EL Speisestärke|500 ml Milch|1 Pck Vanillesoßenpulver|2 EL Zucker',
    'Kirschsaft mit Zucker aufkochen, Beeren zugeben.|Stärke mit etwas Wasser anrühren, einrühren und kurz aufkochen.|Abkühlen lassen.|Vanillesoße nach Packung kochen und zur Grütze servieren.');
  r('apfelstrudel', 'Apfelstrudel', 75, 8, 'stuecke:kruste,apfel,zucker',
    '1 Pck Strudelteig|1 kg Aepfel|80 g Rosinen|60 g Zucker|1 TL Zimt|50 g Semmelbrösel|80 g Butter|2 EL Puderzucker',
    'Äpfel schälen, in dünne Scheiben schneiden und mit Rosinen, Zucker und Zimt mischen.|Semmelbrösel in 30 g Butter rösten.|Strudelteig ausbreiten, mit Butter bestreichen, Brösel und Äpfel darauf verteilen und aufrollen.|Mit Butter bestreichen, bei 190 °C 35 Minuten backen und mit Puderzucker bestäuben.');
  r('schokopudding', 'Selbstgemachter Schokopudding', 20, 4, 'pudding:schoko,sahne,keine',
    '500 ml Milch|40 g Speisestärke|50 g Zucker|2 EL Kakao|80 g Zartbitterschokolade|1 Prise Salz',
    'Stärke, Zucker, Kakao und Salz mit 100 ml Milch glatt rühren.|Restliche Milch aufkochen, Mischung einrühren und 1 Minute unter Rühren köcheln.|Gehackte Schokolade darin schmelzen.|In Schälchen füllen und abkühlen lassen.');
  r('bratapfel', 'Bratäpfel mit Vanillesoße', 40, 4, 'kugeln:gruenapfel,nuss',
    '4 Aepfel (Boskop)|40 g Marzipan|30 g Mandeln|30 g Rosinen|1 TL Zimt|20 g Butter|500 ml Vanillesoße',
    'Kerngehäuse der Äpfel ausstechen.|Marzipan mit gehackten Mandeln, Rosinen und Zimt verkneten und in die Äpfel füllen.|Butterflöckchen daraufsetzen und bei 180 °C 25–30 Minuten backen.|Mit warmer Vanillesoße servieren.');
  r('pavlova', 'Pavlova mit Beeren', 120, 8, 'torte:sahne,keine,beere',
    '4 Stk Eiweiß|200 g Zucker|1 TL Speisestärke|1 TL Weißweinessig|300 ml Sahne|400 g Beeren (frisch)|1 Stk Passionsfrucht',
    'Eiweiß steif schlagen, Zucker langsam einrieseln lassen, bis die Masse glänzt.|Stärke und Essig unterheben, als Kreis auf Backpapier streichen.|Bei 120 °C 90 Minuten backen und im Ofen abkühlen lassen.|Mit geschlagener Sahne, Beeren und Passionsfrucht belegen.');
  r('eton-mess', 'Eton Mess', 15, 4, 'dessert:erdbeere,sahne,erdbeere',
    '400 g Erdbeeren|2 EL Puderzucker|300 ml Sahne|100 g Baisers',
    'Die Hälfte der Erdbeeren mit Puderzucker pürieren, den Rest vierteln.|Sahne halbsteif schlagen.|Baisers zerbröseln und mit Sahne, Erdbeeren und Püree locker vermengen.|Sofort in Gläsern servieren.');
  r('affogato', 'Affogato al caffè', 5, 2, 'tasse:kaffee,vanille,#FDFDFB',
    '4 Stk Kugeln Vanilleeis|2 Stk Espresso (heiß)|2 EL Amarettini',
    'Je zwei Kugeln Eis in ein Glas geben.|Heißen Espresso darübergießen.|Mit zerbröselten Amarettini sofort servieren.');
  r('zitronensorbet', 'Zitronensorbet', 20, 6, 'eis:zitrone,zitrone,limette',
    '250 ml Wasser|200 g Zucker|4 Zitrone|1 Stk Eiweiß',
    'Wasser mit Zucker aufkochen, bis er sich gelöst hat, und abkühlen lassen.|Saft und Abrieb der Zitronen zugeben.|In der Eismaschine gefrieren lassen, zuletzt leicht geschlagenes Eiweiß zugeben (alternativ im Gefrierfach alle 30 Min. umrühren).');
  r('vanilleeis', 'Selbstgemachtes Vanilleeis', 40, 6, 'eis:vanille,vanille,vanille',
    '300 ml Sahne|200 ml Milch|1 Stk Vanilleschote|4 Eigelb|100 g Zucker',
    'Sahne, Milch und Vanille aufkochen.|Eigelb mit Zucker schaumig schlagen, heiße Milch einrühren.|Unter Rühren bis kurz vor dem Kochen erhitzen, bis die Masse eindickt (zur Rose abziehen).|Abkühlen lassen und in der Eismaschine gefrieren.');
  r('lava-cake', 'Schoko-Lava-Küchlein', 25, 4, 'pudding:schoko,erdbeere,keine',
    '100 g Zartbitterschokolade|100 g Butter|2 Eier|2 Eigelb|60 g Zucker|30 g Weizenmehl',
    'Schokolade und Butter schmelzen.|Eier, Eigelb und Zucker schaumig schlagen und die Schokobutter unterrühren.|Mehl unterheben und in gebutterte Förmchen füllen.|Bei 220 °C 9–10 Minuten backen – der Kern bleibt flüssig. Sofort stürzen.');
  r('crepes', 'Crêpes mit Zimtzucker', 30, 4, 'gefaltet:teig,zimt,zucker',
    '250 g Weizenmehl|3 Eier|500 ml Milch|1 Prise Salz|30 g Butter|4 EL Zimtzucker',
    'Mehl, Eier, Milch und Salz glatt rühren und 15 Minuten ruhen lassen.|Wenig Butter in einer Pfanne erhitzen, eine dünne Schicht Teig eingießen und verteilen.|Von beiden Seiten hellbraun backen.|Mit Zimtzucker bestreuen und zusammenfalten.');
  r('germknoedel', 'Germknödel mit Mohn', 120, 6, 'kugeln:sahne,mohn',
    '500 g Weizenmehl|1 Pck Trockenhefe|250 ml Milch|50 g Zucker|1 Eier|50 g Butter|200 g Pflaumenmus|100 g Butter (geschmolzen)|80 g Gemahlener Mohn|50 g Puderzucker',
    'Hefeteig kneten und 1 Stunde gehen lassen.|In 6 Stücke teilen, flach drücken, mit Pflaumenmus füllen und zu Knödeln formen.|Nochmals 20 Minuten gehen lassen und über Dampf zugedeckt 20 Minuten garen.|Mit flüssiger Butter übergießen und mit Mohn-Puderzucker bestreuen.');
  r('apfel-crumble', 'Apfel-Crumble', 50, 6, 'auflauf:apfel,teig,zimt',
    '1 kg Aepfel|1 TL Zimt|2 EL Zucker|150 g Weizenmehl|100 g Haferflocken|100 g Brauner Zucker|120 g Butter (kalt)',
    'Äpfel würfeln, mit Zimt und Zucker mischen und in eine Form geben.|Mehl, Haferflocken, braunen Zucker und Butter zu Streuseln verkrümeln.|Streusel über die Äpfel geben.|Bei 190 °C 35 Minuten backen, warm mit Vanilleeis servieren.');
  r('dampfnudeln', 'Dampfnudeln mit Vanillesoße', 120, 6, 'broetchen:sahne,karamell',
    '500 g Weizenmehl|1 Pck Trockenhefe|250 ml Milch|50 g Zucker|1 Eier|50 g Butter|200 ml Milch|30 g Butter|1 EL Zucker|500 ml Vanillesoße',
    'Hefeteig kneten, 1 Stunde gehen lassen und 8 Kugeln formen.|Milch, Butter und Zucker in einem breiten Topf mit Deckel erhitzen.|Kugeln hineinsetzen und zugedeckt 25 Minuten bei mittlerer Hitze garen – nicht öffnen!|Wenn es knistert, ist die Kruste fertig. Mit Vanillesoße servieren.');
  r('quarkspeise', 'Mandarinen-Quarkspeise', 10, 4, 'dessert:orange,vanille,minze',
    '500 g Magerquark|200 ml Sahne|60 g Zucker|1 Pck Vanillezucker|2 Dose Mandarinen',
    'Quark mit Zucker und Vanillezucker glatt rühren.|Sahne steif schlagen und unterheben.|Abgetropfte Mandarinen unterheben bzw. in Gläsern schichten.');
  r('mango-sticky-rice', 'Mango Sticky Rice', 50, 4, 'teller:reis,mango,sesam',
    '250 g Klebreis|300 ml Kokosmilch|60 g Zucker|1 Prise Salz|2 Stk Mangos|1 EL Sesam',
    'Klebreis mindestens 4 Stunden einweichen und 25 Minuten dämpfen.|Kokosmilch mit Zucker und Salz erwärmen, zwei Drittel unter den heißen Reis mischen und ziehen lassen.|Mango in Spalten schneiden.|Reis mit Mango anrichten, restliche Kokosmilch darübergeben und mit Sesam bestreuen.');
  r('churros', 'Churros mit Schokosoße', 40, 4, 'pommes:kruste,schoko',
    '250 ml Wasser|30 g Butter|1 Prise Salz|150 g Weizenmehl|1 Eier|1 l Sonnenblumenöl|4 EL Zimtzucker|150 g Zartbitterschokolade|150 ml Sahne',
    'Wasser mit Butter und Salz aufkochen, Mehl auf einmal zugeben und zu einem Kloß abbrennen.|Etwas abkühlen lassen und das Ei unterrühren.|Teig mit einem Sternspritzbeutel ins 175 °C heiße Öl spritzen und goldbraun frittieren, in Zimtzucker wälzen.|Schokolade in heißer Sahne schmelzen und als Dip reichen.');
  r('banana-split', 'Banana Split', 10, 2, 'eis:vanille,schoko,erdbeere',
    '2 Banane|6 Stk Kugeln Eis (Vanille, Schoko, Erdbeer)|100 ml Schokosoße|100 ml Sahne|2 EL Gehackte Nüsse|2 Stk Cocktailkirschen',
    'Bananen längs halbieren und in Schalen legen.|Je drei Eiskugeln dazwischen setzen.|Mit Schokosoße, geschlagener Sahne, Nüssen und Kirschen garnieren.');
  r('trifle', 'Beeren-Trifle', 30, 6, 'dessert:beere,vanille,sahne',
    '200 g Biskuitboden|3 EL Sherry oder Orangensaft|400 g Beeren (frisch)|500 ml Vanillepudding|250 ml Sahne|1 EL Zucker',
    'Biskuit in Würfel schneiden und mit Sherry beträufeln.|Abwechselnd Biskuit, Beeren und Pudding in eine Glasschale schichten.|Sahne mit Zucker steif schlagen und obenauf geben.|Mit Beeren garnieren und 2 Stunden kühlen.');
  r('griessflammeri', 'Grießflammeri mit Himbeersoße', 25, 4, 'pudding:vanille,himbeere,keine',
    '500 ml Milch|60 g Weichweizengrieß|50 g Zucker|1 Pck Vanillezucker|1 Eier|300 g Himbeeren|2 EL Puderzucker',
    'Milch mit Zucker und Vanillezucker aufkochen, Grieß einrühren und 5 Minuten quellen lassen.|Eigelb unterrühren, Eiweiß steif schlagen und unterheben.|In kalt ausgespülte Förmchen füllen und 3 Stunden kühlen.|Himbeeren mit Puderzucker pürieren und zum gestürzten Flammeri servieren.');
  r('schokofondue', 'Schokofondue mit Obst', 20, 4, 'dip:schoko,banane,erdbeere',
    '200 g Zartbitterschokolade|200 ml Sahne|500 g Erdbeeren|2 Banane|1 Stk Ananas|1 Stk Birne',
    'Obst waschen und in mundgerechte Stücke schneiden.|Sahne erhitzen und die gehackte Schokolade darin schmelzen.|Im Fonduetopf warm halten und das Obst mit Spießen eintauchen.');
  r('nicecream', 'Bananen-Nicecream', 10, 2, 'eis:banane,schoko,erdbeere',
    '3 Banane (gefroren)|50 ml Hafermilch (angereichert)|1 EL Kakao|1 EL Erdnussmus',
    'Gefrorene Bananenscheiben mit Hafermilch im Mixer cremig pürieren.|Nach Wunsch Kakao oder Erdnussmus untermixen.|Sofort als Softeis servieren oder 30 Minuten nachfrieren.');
  r('baklava', 'Baklava', 90, 24, 'stuecke:kruste,honig,pistazie',
    '1 Pck Filoteig|250 g Walnüsse|150 g Pistazien|1 TL Zimt|200 g Butter (geschmolzen)|250 g Zucker|200 ml Wasser|3 EL Honig|1 Zitrone',
    'Nüsse fein hacken und mit Zimt mischen.|Filoblätter einzeln gebuttert in eine Form schichten, nach einem Drittel und zwei Dritteln Nüsse einstreuen.|In Rauten schneiden und bei 170 °C 45 Minuten goldbraun backen.|Zucker, Wasser, Honig und Zitronensaft zu Sirup kochen und über die heiße Baklava gießen. Durchziehen lassen.');
  r('zabaione', 'Zabaione mit Erdbeeren', 15, 4, 'dessert:erdbeere,vanille,erdbeere',
    '4 Eigelb|60 g Zucker|100 ml Marsala|300 g Erdbeeren',
    'Erdbeeren vierteln und in Gläser verteilen.|Eigelb, Zucker und Marsala über dem heißen Wasserbad 5–8 Minuten zu einer luftigen Creme aufschlagen.|Sofort warm über die Erdbeeren geben.');

  /* ==================== Getränke ==================== */
  kat = 'Getränke';
  r('mango-lassi', 'Mango-Lassi', 5, 2, 'glas:mango,sahne,keine',
    '1 Stk Mango|300 g Naturjoghurt|150 ml Milch|2 TL Honig|1 Prise Kardamom',
    'Mango schälen und das Fruchtfleisch würfeln.|Mit Joghurt, Milch, Honig und Kardamom fein mixen.|Eiskalt servieren.');
  r('erdbeer-bananen-smoothie', 'Erdbeer-Bananen-Smoothie', 5, 2, 'glas:erdbeere,keine,banane',
    '250 g Erdbeeren|1 Banane|200 ml Orangensaft|100 g Naturjoghurt',
    'Erdbeeren putzen, Banane schälen.|Alles im Mixer cremig pürieren.|Sofort servieren.');
  r('heisse-schokolade', 'Heiße Schokolade', 10, 2, 'tasse:schoko,sahne,#E9DCCF',
    '500 ml Milch|80 g Zartbitterschokolade|1 EL Zucker|1 Prise Zimt|100 ml Sahne',
    'Milch erhitzen, gehackte Schokolade und Zucker darin unter Rühren schmelzen.|Mit Zimt abschmecken.|In Tassen füllen und mit geschlagener Sahne servieren.');
  r('chai-latte', 'Chai Latte', 15, 2, 'tasse:tee,sahne,#F2EEE6',
    '250 ml Wasser|2 Stk Schwarzteebeutel|1 Stk Zimtstange|4 Stk Kardamomkapseln|3 Stk Nelken|10 g Ingwer|300 ml Milch|2 TL Honig',
    'Wasser mit Gewürzen und Ingwer 5 Minuten köcheln.|Teebeutel zugeben und 3 Minuten ziehen lassen.|Milch erhitzen und aufschäumen.|Tee abseihen, mit Honig süßen und mit Milchschaum aufgießen.');
  r('pfirsich-eistee', 'Pfirsich-Eistee', 20, 4, 'glas:pfirsich,keine,zitrone',
    '1 l Wasser|4 Stk Schwarzteebeutel|3 Stk Pfirsiche|60 g Zucker|1 Zitrone|1 Bund Minze',
    'Tee mit heißem Wasser aufgießen, 4 Minuten ziehen lassen und Beutel entfernen.|Pfirsiche würfeln, mit Zucker und 100 ml Wasser 5 Minuten köcheln und pürieren.|Tee, Pfirsichpüree und Zitronensaft mischen und kalt stellen.|Mit Eis und Minze servieren.');
  r('zitronenlimonade', 'Hausgemachte Zitronenlimonade', 15, 6, 'glas:zitrone,keine,zitrone',
    '5 Zitrone|120 g Zucker|1.2 l Sprudelwasser|1 Bund Minze|200 g Eiswürfel',
    'Zucker mit 150 ml Wasser aufkochen, bis er sich gelöst hat, und abkühlen lassen.|Zitronen auspressen und mit dem Sirup mischen.|Mit Sprudelwasser auffüllen und mit Eis, Zitronenscheiben und Minze servieren.');
  r('ingwer-shot', 'Ingwer-Shot', 10, 6, 'glas:orange,keine,zitrone',
    '150 g Ingwer|2 Zitrone|2 Stk Orangen|1 EL Honig|1 Prise Kurkuma|1 Prise Pfeffer',
    'Ingwer grob schneiden, Zitrus auspressen.|Alles mit Honig, Kurkuma, Pfeffer und 100 ml Wasser fein mixen.|Durch ein Sieb gießen und in kleinen Flaschen kühl lagern (3–4 Tage).');
  r('golden-milk', 'Golden Milk', 10, 2, 'tasse:curry,keine,#F2EEE6',
    '500 ml Hafermilch (angereichert)|1 TL Kurkuma|0.5 TL Zimt|1 Prise Ingwerpulver|1 Prise Pfeffer|2 TL Honig',
    'Milch mit allen Gewürzen erhitzen, nicht kochen.|Mit Honig süßen.|Mit dem Milchaufschäumer schaumig schlagen und servieren.');
  r('eiskaffee', 'Eiskaffee', 10, 2, 'glas:kaffee,sahne,keine',
    '300 ml Kaffee (kalt)|4 Stk Kugeln Vanilleeis|100 ml Sahne|1 EL Schokoraspel',
    'Je zwei Kugeln Eis in hohe Gläser geben.|Mit kaltem Kaffee aufgießen.|Mit geschlagener Sahne und Schokoraspeln garnieren.');
  r('bananenmilch', 'Bananenmilch', 5, 2, 'glas:banane,keine,keine',
    '2 Banane|500 ml Milch|1 TL Honig|1 Prise Zimt',
    'Bananen in Stücke brechen.|Mit Milch, Honig und Zimt schaumig mixen.|Kalt servieren.');
  r('erdbeer-milchshake', 'Erdbeer-Milchshake', 5, 2, 'glas:pink,sahne,keine',
    '250 g Erdbeeren|300 ml Milch|3 Stk Kugeln Vanilleeis|1 EL Zucker',
    'Erdbeeren putzen.|Mit Milch, Eis und Zucker cremig mixen.|In Gläser füllen und sofort servieren.');
  r('holunder-schorle', 'Holunderblüten-Minz-Schorle', 5, 4, 'glas:holunder,keine,limette',
    '120 ml Holunderblütensirup|1 l Sprudelwasser|1 Limette|1 Bund Minze|200 g Eiswürfel',
    'Sirup auf Gläser verteilen.|Limettenscheiben und Minze zugeben und leicht andrücken.|Mit Eis und Sprudelwasser auffüllen.');
  r('virgin-mojito', 'Virgin Mojito', 5, 2, 'glas:minze,keine,limette',
    '2 Limette|2 EL Rohrzucker|1 Bund Minze|400 ml Sprudelwasser|200 g Crushed Ice',
    'Limetten achteln und mit Zucker und Minze in Gläsern zerstoßen.|Mit Crushed Ice auffüllen.|Mit Sprudelwasser aufgießen und umrühren.');
  r('virgin-pina-colada', 'Virgin Piña Colada', 5, 2, 'glas:kokos,keine,mango',
    '300 ml Ananassaft|100 ml Kokosmilch|50 ml Sahne|150 g Crushed Ice|2 Stk Ananasstücke',
    'Saft, Kokosmilch, Sahne und Eis im Mixer schaumig mixen.|In Gläser füllen.|Mit Ananasstück garnieren.');
  r('kinderpunsch', 'Kinderpunsch', 15, 6, 'tasse:kirsche,keine,#F2EEE6',
    '500 ml Früchtetee|500 ml Kirschsaft|250 ml Orangensaft|1 Stk Zimtstange|3 Stk Nelken|1 Stk Sternanis|2 EL Honig',
    'Tee kochen und mit den Säften mischen.|Gewürze zugeben und 10 Minuten heiß ziehen lassen (nicht kochen).|Mit Honig süßen und durchsieben.');
  r('frappe', 'Griechischer Frappé', 5, 1, 'glas:kaffee,creme,keine',
    '2 TL Instantkaffee|2 TL Zucker|50 ml Wasser (kalt)|100 ml Milch|100 g Eiswürfel',
    'Instantkaffee, Zucker und Wasser im Shaker kräftig schütteln, bis dichter Schaum entsteht.|In ein Glas mit Eis gießen.|Mit kalter Milch auffüllen.');
  r('matcha-latte', 'Matcha Latte', 5, 1, 'tasse:matcha,milch,#F2EEE6',
    '1 TL Matcha-Pulver|50 ml Wasser (80 °C)|200 ml Milch|1 TL Honig',
    'Matcha mit dem Wasser mit einem Bambusbesen schaumig schlagen.|Milch erhitzen und aufschäumen.|Matcha in eine Tasse geben, mit Milch aufgießen und nach Wunsch süßen.');
  r('ingwer-zitronen-tee', 'Ingwer-Zitronen-Tee', 10, 2, 'tasse:zitrone,keine,#F2EEE6',
    '40 g Ingwer|1 Zitrone|500 ml Wasser|2 TL Honig',
    'Ingwer in dünne Scheiben schneiden.|Mit kochendem Wasser übergießen und 8 Minuten ziehen lassen.|Zitronensaft und Honig zugeben.');
  r('minztee', 'Marokkanischer Minztee', 10, 4, 'glas:tee,keine,minze',
    '2 TL Grüner Tee (Gunpowder)|1 Bund Nana-Minze|3 EL Zucker|800 ml Wasser',
    'Tee in der Kanne mit wenig heißem Wasser kurz spülen, Wasser abgießen.|Minze und Zucker zugeben und mit kochendem Wasser aufgießen.|5 Minuten ziehen lassen und aus der Höhe in Gläser gießen.');
  r('agua-fresca', 'Wassermelonen-Agua-Fresca', 10, 4, 'glas:wassermelone,keine,limette',
    '1 kg Wassermelone|500 ml Wasser|1 Limette|1 EL Agavendicksaft|1 Bund Minze',
    'Fruchtfleisch der Melone mit Wasser pürieren und durchsieben.|Mit Limettensaft und Agavendicksaft abschmecken.|Auf Eis mit Minze servieren.');
  r('horchata', 'Horchata', 15, 4, 'glas:milch,keine,keine',
    '150 g Langkornreis|1 Stk Zimtstange|1 l Wasser|250 ml Milch|80 g Zucker|1 TL Vanilleextrakt',
    'Reis mit Zimt in 1 l Wasser über Nacht einweichen.|Alles fein mixen und durch ein Tuch abseihen.|Mit Milch, Zucker und Vanille verrühren und eiskalt servieren.');
  r('ayran', 'Ayran', 5, 2, 'glas:joghurt,sahne,keine',
    '300 g Naturjoghurt|300 ml Wasser (kalt)|1 Prise Salz|4 Stk Minzblätter',
    'Joghurt, Wasser und Salz schaumig mixen.|In Gläser füllen und mit Minze servieren.');
  r('bubble-tea', 'Bubble Tea (Milchtee)', 30, 2, 'glas:tee,tapioka,keine',
    '100 g Tapiokaperlen|3 EL Brauner Zucker|2 Stk Schwarzteebeutel|300 ml Wasser|200 ml Milch|150 g Eiswürfel',
    'Tapiokaperlen nach Packung kochen, abspülen und mit braunem Zucker mischen.|Tee kräftig aufbrühen und abkühlen lassen.|Perlen in Gläser geben, Eis zugeben, mit Tee und Milch aufgießen.|Mit dicken Strohhalmen servieren.');
  r('rhabarber-schorle', 'Rhabarber-Schorle', 30, 6, 'glas:rhabarber,keine,keine',
    '500 g Rhabarber|100 g Zucker|500 ml Wasser|1 l Sprudelwasser',
    'Rhabarber in Stücke schneiden und mit Zucker und Wasser 15 Minuten köcheln.|Durch ein Sieb gießen und den Sirup abkühlen lassen.|Mit Sprudelwasser 1:2 auffüllen und mit Eis servieren.');
  r('aperol-spritz', 'Aperol Spritz (mit Alkohol)', 5, 1, 'glas:aperol,keine,orange',
    '90 ml Prosecco|60 ml Aperol|30 ml Sodawasser|1 Stk Orangenscheibe|100 g Eiswürfel',
    'Weinglas mit Eis füllen.|Prosecco, Aperol und Soda in dieser Reihenfolge eingießen.|Mit einer Orangenscheibe garnieren.');
  r('sangria', 'Sangria (mit Alkohol)', 15, 6, 'glas:rotwein,keine,orange',
    '750 ml Rotwein|250 ml Orangensaft|50 ml Brandy|2 EL Zucker|1 Stk Orangen|1 Apfel|1 Zitrone|1 Stk Zimtstange',
    'Obst in kleine Stücke schneiden.|Mit Wein, Saft, Brandy, Zucker und Zimt mischen.|Mindestens 2 Stunden kalt durchziehen lassen und mit Eis servieren.');
  r('gluehwein', 'Glühwein (mit Alkohol)', 20, 6, 'tasse:rotwein,keine,#F2EEE6',
    '1 l Rotwein|1 Stk Orangen|2 Stk Zimtstangen|4 Stk Nelken|2 Stk Sternanis|60 g Zucker',
    'Wein mit Orangenscheiben, Gewürzen und Zucker langsam erhitzen – nicht kochen.|20 Minuten ziehen lassen.|Durchsieben und heiß servieren.');
  r('protein-shake', 'Vanille-Protein-Shake', 5, 1, 'glas:vanille,keine,banane',
    '300 ml Milch|150 g Skyr|1 Banane|1 TL Vanilleextrakt|20 g Haferflocken',
    'Alle Zutaten in den Mixer geben.|Cremig mixen.|Sofort trinken.');
  r('gurken-wasser', 'Gurken-Limetten-Wasser', 5, 6, 'glas:wasser,keine,limette',
    '1.5 l Wasser|0.5 Gurke|1 Limette|1 Bund Minze',
    'Gurke und Limette in dünne Scheiben schneiden.|Mit Minze in eine Karaffe geben und mit kaltem Wasser auffüllen.|Mindestens 1 Stunde im Kühlschrank ziehen lassen.');
})(typeof window !== 'undefined' ? window : globalThis);
