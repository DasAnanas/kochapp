# Prüfbericht Nährwerte

Erzeugt von `tools/naehrwerte/verify.ps1` – nicht von Hand ändern.

**Quellen**
- Schweizer Nährwertdatenbank V 7.1, Bundesamt für Lebensmittelsicherheit und Veterinärwesen (BLV), https://naehrwertdaten.ch
- USDA FoodData Central, SR Legacy (2018-04), U.S. Department of Agriculture, https://fdc.nal.usda.gov

**Vorgehen:** Jedes Lebensmittel wurde je einem Eintrag beider Datenbanken zugeordnet (`foods.tsv`). Für jeden der 15 Nährstoffe werden beide Werte verglichen. Übernommen wird der Schweizer Wert; fehlt er, der USDA-Wert. Wo die Abweichungen bei den Makronährstoffen von Hand geprüft wurden und der Schweizer Eintrag ein anderes Produkt beschreibt als hierzulande üblich, ist in `foods.tsv` (Spalte `pick`) stattdessen der USDA-Wert oder der Mittelwert beider Quellen gewählt; die Spalte „übernommen“ zeigt das an. Als Übereinstimmung gilt eine Abweichung von höchstens 20 % (Ballaststoffe 30 %, Vitamine und Mineralstoffe 50 %) oder eine kleine absolute Differenz. Kohlenhydrate sind verfügbare Kohlenhydrate (USDA: Gesamtkohlenhydrate minus Ballaststoffe). Bei Flüssigkeiten sind die Werte mit der Dichte auf 100 ml umgerechnet.

**Ergebnis:** 154 Lebensmittel – 144 mit zwei Quellen, 9 mit nur einer Quelle, 1 ohne Quelle (Schätzwert bleibt). Von 2310 Einzelwerten stimmen 1917 in beiden Quellen überein, 203 weichen ab, 174 stammen aus nur einer Quelle, 16 haben keine Quelle.

Abweichungen bei Vitaminen und Mineralstoffen sind zwischen Datenbanken üblich (Sorte, Anbau, Messmethode, Anreicherung).

## Übersicht

| Lebensmittel | Schweizer Nährwertdatenbank (ID) | USDA (FDC-ID) | gleich | abweichend | 1 Quelle | übernommen | Status |
|---|---|---|---|---|---|---|---|
| Haferflocken | Haferflocken (198) | Cereals, oats, regular and quick, not fortified, dry (173904) | 15 | 0 | 0 | CH | doppelt geprüft |
| Vollkornnudeln | Teigwaren ohne Ei, Vollkorn, trocken (801) | Pasta, whole-wheat, dry (169738) | 13 | 0 | 2 | CH | doppelt geprüft |
| Nudeln | Teigwaren ohne Ei, trocken (800) | Pasta, dry, unenriched (168927) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Reis | Reis poliert, trocken (427) | Rice, white, long-grain, regular, raw, unenriched (169756) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Quinoa | Quinoa, roh (13394) | Quinoa, uncooked (168874) | 14 | 0 | 1 | CH | doppelt geprüft |
| Couscous | – | Couscous, dry (169699) | 0 | 0 | 15 | USDA | nur eine Quelle |
| Kartoffeln | Kartoffel, geschält, roh (813) | Potatoes, flesh and skin, raw (170026) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Süßkartoffel | Süsskartoffel, roh (13406) | Sweet potato, raw, unprepared (168482) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Vollkornbrot | Weizenvollkornbrot (821) | Bread, whole-wheat, commercially prepared (172688) | 12 | 3 | 0 | CH | doppelt geprüft, 3 Abweichung(en) |
| Weizen-Tortilla | – | Tortillas, ready-to-bake or -fry, flour, refrigerated (175037) | 0 | 0 | 15 | USDA | nur eine Quelle |
| Weizenmehl | Weizenmehl (Backmehl), Typ 550 (204) | Wheat flour, white, all-purpose, unenriched (169761) | 15 | 0 | 0 | CH | doppelt geprüft |
| Rote Linsen | Linse, geschält, getrocknet (13385) | Lentils, pink or red, raw (174284) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Kichererbsen (Dose) | Kichererbse, gekocht (ohne Zugabe von Fett und Salz) (1059) | Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids (173800) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Kidneybohnen (Dose) | Bohne (alle Arten), gekocht (ohne Zugabe von Fett und Salz) (13388) | Beans, kidney, red, mature seeds, canned, drained solids (174285) | 12 | 2 | 1 | USDA | doppelt geprüft, 2 Abweichung(en) |
| Tofu | Tofu, fest, nature (Durchschnitt) (13437) | Tofu, raw, firm, prepared with calcium sulfate (172475) | 11 | 3 | 1 | CH | doppelt geprüft, 3 Abweichung(en) |
| Erdnussmus | Erdnussbutter (751) | Peanut butter, smooth style, without salt (172470) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Mandeln | Mandel (273) | Nuts, almonds (170567) | 15 | 0 | 0 | CH | doppelt geprüft |
| Walnüsse | Baumnuss (271) | Nuts, walnuts, english (170187) | 15 | 0 | 0 | CH | doppelt geprüft |
| Chiasamen | Chia-Samen (13457) | Seeds, chia seeds, dried (170554) | 11 | 2 | 2 | CH | doppelt geprüft, 2 Abweichung(en) |
| Leinsamen | Leinsamen (277) | Seeds, flaxseed (169414) | 15 | 0 | 0 | CH | doppelt geprüft |
| Kürbiskerne | Kürbiskerne (276) | Seeds, pumpkin and squash seed kernels, dried (170556) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Tahin (Sesammus) | – | Seeds, sesame butter, tahini, from roasted and toasted kernels (most common type) (170189) | 0 | 0 | 15 | USDA | nur eine Quelle |
| Milch | Halbentrahmte Milch 1.5% Fett, UHT (13399) | Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D (170872) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Hafermilch (angereichert) | Hafergetränk, nature mit Calcium und Vitaminen angereichert (14130) | – | 0 | 0 | 15 | CH | nur eine Quelle |
| Naturjoghurt | Joghurt, nature (52) | Yogurt, plain, whole milk (171284) | 15 | 0 | 0 | CH | doppelt geprüft |
| Skyr | – | – | 0 | 0 | 0 | – | ungeprüft (Schätzwert) |
| Magerquark | Quark, nature, mager (71) | – | 0 | 0 | 15 | CH | nur eine Quelle |
| Feta | Käse in Salzlake (Schaf- und Ziegenmilch) (549) | Cheese, feta (173420) | 9 | 5 | 1 | CH | doppelt geprüft, 5 Abweichung(en) |
| Mozzarella | Mozzarella (82) | Cheese, mozzarella, whole milk (170845) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Parmesan | Parmesan (482) | Cheese, parmesan, hard (170848) | 13 | 0 | 2 | CH | doppelt geprüft |
| Gouda / Schnittkäse | Hart- und Halbhartkäse, vollfett (Durchschnitt) (1193) | Cheese, gouda (171241) | 15 | 0 | 0 | CH | doppelt geprüft |
| Butter | Vorzugsbutter (49) | Butter, without salt (173430) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Eier | Hühnerei, ganz, roh (290) | Egg, whole, raw, fresh (171287) | 14 | 0 | 1 | CH | doppelt geprüft |
| Kokosmilch | Kokosnussmilch (13458) | Nuts, coconut milk, canned (liquid expressed from grated meat and water) (170173) | 14 | 0 | 1 | CH | doppelt geprüft |
| Hähnchenbrust | Poulet, Brust, ohne Haut, roh (22) | Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw (171077) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Rinderhack | Rind, Gehacktes, roh (14237) | Beef, ground, 85% lean meat / 15% fat, raw (171796) | 15 | 0 | 0 | CH | doppelt geprüft |
| Schinkenwürfel | Hinterschinken (691) | Ham, sliced, pre-packaged, deli meat (96%fat free, water added) (173863) | 12 | 2 | 1 | CH | doppelt geprüft, 2 Abweichung(en) |
| Lachsfilet | Lachs, Zucht, roh (194) | Fish, salmon, Atlantic, farmed, raw (175167) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Thunfisch (Dose) | Thon im Wasser, abgetropft (417) | Fish, tuna, light, canned in water, drained solids (173709) | 12 | 2 | 1 | CH | doppelt geprüft, 2 Abweichung(en) |
| Garnelen | Garnele, geschält, roh (frisch oder tiefgekuhlt) (766) | Crustaceans, shrimp, raw (175179) | 8 | 1 | 6 | CH | doppelt geprüft, 1 Abweichung(en) |
| Zwiebel | Zwiebel, roh (368) | Onions, raw (170000) | 15 | 0 | 0 | CH | doppelt geprüft |
| Knoblauchzehe | Knoblauch, roh (356) | Garlic, raw (169230) | 10 | 5 | 0 | USDA | doppelt geprüft, 5 Abweichung(en) |
| Tomaten | Tomate, roh (348) | Tomatoes, red, ripe, raw, year round average (170457) | 15 | 0 | 0 | CH | doppelt geprüft |
| Dosentomaten (gehackt) | Tomate, geschält (Konserve) (637) | Tomatoes, red, ripe, canned, packed in tomato juice (170051) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Tomatenmark | Tomatenpüree (636) | Tomato products, canned, paste, without salt added (170459) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Paprika | Peperoni, rot, roh (360) | Peppers, sweet, red, raw (170108) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Zucchini | Zucchetti, roh (367) | Squash, summer, zucchini, includes skin, raw (169291) | 15 | 0 | 0 | CH | doppelt geprüft |
| Aubergine | Aubergine, roh (349) | Eggplant, raw (169228) | 15 | 0 | 0 | CH | doppelt geprüft |
| Gurke | Gurke, roh (354) | Cucumber, with peel, raw (168409) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Karotten | Karotte, roh (355) | Carrots, raw (170393) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Brokkoli | Broccoli, roh (351) | Broccoli, raw (170379) | 15 | 0 | 0 | CH | doppelt geprüft |
| Spinat | Spinat, roh (365) | Spinach, raw (168462) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Blumenkohl | Blumenkohl, roh (350) | Cauliflower, raw (169986) | 15 | 0 | 0 | CH | doppelt geprüft |
| Champignons | Champignon, roh (375) | Mushrooms, white, raw (169251) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Rucola | Rucola, roh (468) | Arugula, raw (169387) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Lauch | Lauch, roh (358) | Leeks, (bulb and lower leaf-portion), raw (169246) | 8 | 7 | 0 | CH | doppelt geprüft, 7 Abweichung(en) |
| Kürbis (Hokkaido) | Kürbis, roh (480) | Pumpkin, raw (168448) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Mais (Dose) | Zuckermais (Konserve) (632) | Corn, sweet, yellow, canned, whole kernel, drained solids (169214) | 13 | 2 | 0 | Mittelwert | doppelt geprüft, 2 Abweichung(en) |
| Erbsen (TK) | Erbse, grün, tiefgekühlt (14219) | Peas, green, frozen, unprepared (170016) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Ingwer | Ingwer, roh (14239) | Ginger root, raw (169231) | 13 | 2 | 0 | Mittelwert | doppelt geprüft, 2 Abweichung(en) |
| Avocado | Avocado, roh (380) | Avocados, raw, all commercial varieties (171705) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Zitrone | Zitrone, roh (398) | Lemons, raw, without peel (167746) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Banane | Banane, roh (381) | Bananas, raw (173944) | 15 | 0 | 0 | CH | doppelt geprüft |
| Apfel | Apfel, roh (378) | Apples, raw, with skin (171688) | 15 | 0 | 0 | CH | doppelt geprüft |
| Beeren (TK-Mix) | Beeren (Durchschnitt), roh (1119) | – | 0 | 0 | 15 | CH | nur eine Quelle |
| Olivenöl | Olivenöl (591) | Oil, olive, salad or cooking (171413) | 15 | 0 | 0 | CH | doppelt geprüft |
| Salz | Kochsalz ohne Jod und Fluor (634) | Salt, table (173468) | 15 | 0 | 0 | CH | doppelt geprüft |
| Pfeffer | – | Spices, pepper, black (170931) | 0 | 0 | 15 | USDA | nur eine Quelle |
| Gemüsebrühe | Bouillon, Gemüse, zubereitet (664) | – | 0 | 0 | 14 | CH | nur eine Quelle |
| Currypulver | – | Spices, curry powder (170924) | 0 | 0 | 15 | USDA | nur eine Quelle |
| Zimt | Zimt (911) | Spices, cinnamon, ground (171320) | 10 | 5 | 0 | Mittelwert | doppelt geprüft, 5 Abweichung(en) |
| Paprikapulver | Paprika (Gewürz) (663) | Spices, paprika (171329) | 11 | 4 | 0 | Mittelwert | doppelt geprüft, 4 Abweichung(en) |
| Sojasauce | Sojasauce (13456) | Soy sauce made from soy and wheat (shoyu) (174277) | 15 | 0 | 0 | CH | doppelt geprüft |
| Honig | Honig (Blütenhonig) (472) | Honey (169640) | 15 | 0 | 0 | CH | doppelt geprüft |
| Zucker | Zucker, weiss (470) | Sugars, granulated (169655) | 15 | 0 | 0 | CH | doppelt geprüft |
| Weizenvollkornmehl | Weizenmehl, Vollkorn, Typ 1700 (206) | Wheat flour, whole-grain (168893) | 15 | 0 | 0 | CH | doppelt geprüft |
| Speisestärke | Maisstärke (426) | Cornstarch (169698) | 13 | 1 | 1 | CH | doppelt geprüft, 1 Abweichung(en) |
| Hefe (frisch) | Bäckerhefe, gepresst (763) | Leavening agents, yeast, baker's, compressed (175042) | 12 | 3 | 0 | CH | doppelt geprüft, 3 Abweichung(en) |
| Sahne | Vollrahm, pasteurisiert (65) | Cream, fluid, heavy whipping (170859) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Saure Sahne | Saurer Halbrahm (575) | Cream, sour, cultured (171257) | 14 | 0 | 1 | Mittelwert | doppelt geprüft |
| Frischkäse | Frischkäse, Doppelrahm (567) | Cheese, cream (173418) | 10 | 3 | 2 | USDA | doppelt geprüft, 3 Abweichung(en) |
| Hüttenkäse | Hüttenkäse, nature (505) | Cheese, cottage, creamed, large or small curd (172179) | 15 | 0 | 0 | CH | doppelt geprüft |
| Sonnenblumenöl | Sonnenblumenöl (598) | Oil, sunflower, linoleic, (approx. 65%) (171025) | 15 | 0 | 0 | CH | doppelt geprüft |
| Rapsöl | Rapsöl (600) | Oil, canola (172336) | 15 | 0 | 0 | CH | doppelt geprüft |
| Essig | Essig (1693) | Vinegar, distilled (172237) | 15 | 0 | 0 | CH | doppelt geprüft |
| Balsamicoessig | Balsamicoessig (13455) | Vinegar, balsamic (172241) | 9 | 2 | 4 | Mittelwert | doppelt geprüft, 2 Abweichung(en) |
| Senf | Senf (13464) | Mustard, prepared, yellow (172234) | 12 | 3 | 0 | Mittelwert | doppelt geprüft, 3 Abweichung(en) |
| Ketchup | Ketchup (635) | Catsup (168556) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Mayonnaise | Mayonnaise (771) | Salad dressing, mayonnaise, regular (171009) | 15 | 0 | 0 | CH | doppelt geprüft |
| Petersilie | Petersilie, roh (373) | Parsley, fresh (170416) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Schnittlauch | Schnittlauch, roh (374) | Chives, raw (169994) | 15 | 0 | 0 | CH | doppelt geprüft |
| Basilikum | Basilikum, roh (464) | Basil, fresh (172232) | 12 | 3 | 0 | CH | doppelt geprüft, 3 Abweichung(en) |
| Thymian | Thymian, roh (460) | Thyme, fresh (173470) | 7 | 8 | 0 | Mittelwert | doppelt geprüft, 8 Abweichung(en) |
| Rosmarin | Rosmarin, roh (462) | Rosemary, fresh (173473) | 7 | 8 | 0 | Mittelwert | doppelt geprüft, 8 Abweichung(en) |
| Orange | Orange, roh (405) | Oranges, raw, all commercial varieties (169097) | 15 | 0 | 0 | CH | doppelt geprüft |
| Zitronensaft | Zitronensaft (605) | Lemon juice, raw (167747) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Erdbeeren | Erdbeere, roh (385) | Strawberries, raw (167762) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Himbeeren | Himbeere, roh (390) | Raspberries, raw (167755) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Heidelbeeren | Heidelbeere, roh (389) | Blueberries, raw (171711) | 15 | 0 | 0 | CH | doppelt geprüft |
| Birne | Birne, roh (382) | Pears, raw (169118) | 15 | 0 | 0 | CH | doppelt geprüft |
| Weintrauben | Traube, weiss, roh (478) | Grapes, red or green (European type, such as Thompson seedless), raw (174683) | 15 | 0 | 0 | CH | doppelt geprüft |
| Mango | Mango, roh (396) | Mangos, raw (169910) | 15 | 0 | 0 | CH | doppelt geprüft |
| Ananas | Ananas, roh (377) | Pineapple, raw, all varieties (169124) | 15 | 0 | 0 | CH | doppelt geprüft |
| Rosinen | Rosine, getrocknet (477) | Raisins, dark, seedless (168165) | 15 | 0 | 0 | CH | doppelt geprüft |
| Datteln | Dattel, getrocknet (384) | Dates, deglet noor (171726) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Fenchel | Fenchel, roh (352) | Fennel, bulb, raw (169385) | 12 | 3 | 0 | CH | doppelt geprüft, 3 Abweichung(en) |
| Staudensellerie | Stangensellerie, roh (366) | Celery, raw (169988) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Knollensellerie | Knollensellerie, roh (357) | Celeriac, raw (170400) | 12 | 3 | 0 | CH | doppelt geprüft, 3 Abweichung(en) |
| Rote Bete | Rande, roh (451) | Beets, raw (169145) | 15 | 0 | 0 | CH | doppelt geprüft |
| Weißkohl | Weisskohl, roh (453) | Cabbage, raw (169975) | 15 | 0 | 0 | CH | doppelt geprüft |
| Rotkohl | Rotkohl, roh (364) | Cabbage, red, raw (169977) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Rosenkohl | Rosenkohl, roh (363) | Brussels sprouts, raw (170383) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Grüne Bohnen | Bohne, grün, roh (353) | Beans, snap, green, raw (169961) | 15 | 0 | 0 | CH | doppelt geprüft |
| Spargel | Spargel (weiss und grün), roh  (443) | Asparagus, raw (168389) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Kopfsalat | Kopfsalat, roh (448) | Lettuce, butterhead (includes boston and bibb types), raw (168429) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Eisbergsalat | Eisbergsalat, roh (459) | Lettuce, iceberg (includes crisphead types), raw (169248) | 15 | 0 | 0 | CH | doppelt geprüft |
| Radieschen | Radieschen, roh (456) | Radishes, raw (169276) | 15 | 0 | 0 | CH | doppelt geprüft |
| Kohlrabi | Kohlrabi, roh (449) | Kohlrabi, raw (168424) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Grünkohl | Federkohl, roh (13400) | Kale, raw (168421) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Pastinake | Pastinake, roh (13439) | Parsnips, raw (170417) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Schalotte | Schalotte, roh (14281) | Shallots, raw (170499) | 11 | 4 | 0 | CH | doppelt geprüft, 4 Abweichung(en) |
| Oliven | Olive, schwarz (493) | Olives, ripe, canned (small-extra large) (169094) | 10 | 5 | 0 | CH | doppelt geprüft, 5 Abweichung(en) |
| Putenbrust | Truthahn, Brust, Schnitzel oder Geschnetzeltes, roh (713) | Turkey, retail parts, breast, meat only, raw (174515) | 13 | 1 | 1 | CH | doppelt geprüft, 1 Abweichung(en) |
| Schweinefilet | Schwein, Filet, roh (677) | Pork, fresh, loin, tenderloin, separable lean only, raw (168249) | 15 | 0 | 0 | CH | doppelt geprüft |
| Schweinehack | Schwein, Gehacktes, roh (7) | Pork, fresh, ground, raw (167902) | 12 | 2 | 1 | Mittelwert | doppelt geprüft, 2 Abweichung(en) |
| Rindfleisch (Gulasch) | Rind, Voressen, roh (38) | Beef, chuck for stew, separable lean and fat, all grades, raw (171206) | 13 | 2 | 0 | USDA | doppelt geprüft, 2 Abweichung(en) |
| Speck | Kochspeck (704) | Pork, cured, bacon, unprepared (168277) | 12 | 3 | 0 | Mittelwert | doppelt geprüft, 3 Abweichung(en) |
| Kabeljau | Dorsch, roh (285) | Fish, cod, Atlantic, raw (171955) | 15 | 0 | 0 | CH | doppelt geprüft |
| Forelle | Forelle, roh (289) | Fish, trout, rainbow, farmed, raw (173717) | 11 | 3 | 1 | CH | doppelt geprüft, 3 Abweichung(en) |
| Räucherlachs | Lachs, geräuchert (193) | Fish, salmon, chinook, smoked (173687) | 9 | 6 | 0 | CH | doppelt geprüft, 6 Abweichung(en) |
| Tempeh | Tempeh, nature (14251) | Tempeh (174272) | 13 | 1 | 1 | Mittelwert | doppelt geprüft, 1 Abweichung(en) |
| Kichererbsen (getrocknet) | Kichererbse, getrocknet (439) | Chickpeas (garbanzo beans, bengal gram), mature seeds, raw (173756) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Linsen (braun) | Linse, ganz, getrocknet (370) | Lentils, raw (172420) | 11 | 4 | 0 | CH | doppelt geprüft, 4 Abweichung(en) |
| Edamame | Edamame (unreife Sojabohne), geschält, gefroren (14160) | Edamame, frozen, unprepared (168410) | 8 | 4 | 3 | CH | doppelt geprüft, 4 Abweichung(en) |
| Haselnüsse | Haselnuss (270) | Nuts, hazelnuts or filberts (170581) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Cashewkerne | Cashewnuss (275) | Nuts, cashew nuts, raw (170162) | 15 | 0 | 0 | CH | doppelt geprüft |
| Erdnüsse | Erdnuss, geröstet, ohne Salz (14238) | Peanuts, all types, dry-roasted, without salt (173806) | 14 | 0 | 1 | CH | doppelt geprüft |
| Sonnenblumenkerne | Sonnenblumenkerne (281) | Seeds, sunflower seed kernels, dried (170562) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Sesam | Sesamsamen ungeschält (280) | Seeds, sesame seeds, whole, dried (170150) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Pinienkerne | Pinienkerne (283) | Nuts, pine nuts, dried (170591) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Kokosraspel | Kokosnuss, getrocknet (Kokosrapseln, Kokosflocken) (742) | Nuts, coconut meat, dried (desiccated), not sweetened (170170) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Hirse | Hirse, Korn geschält (422) | Millet, raw (169702) | 12 | 3 | 0 | CH | doppelt geprüft, 3 Abweichung(en) |
| Buchweizen | Buchweizen, Korn geschält (421) | Buckwheat (170286) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Polenta (Maisgrieß) | Maisgriess, trocken (425) | Cornmeal, degermed, unenriched, yellow (168929) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Hartweizengrieß | Hartweizengriess, trocken (423) | Semolina, unenriched (168933) | 13 | 2 | 0 | CH | doppelt geprüft, 2 Abweichung(en) |
| Paniermehl | Paniermehl (750) | Bread, crumbs, dry, grated, plain (174928) | 10 | 5 | 0 | CH | doppelt geprüft, 5 Abweichung(en) |
| Weißbrot | Weissbrot (823) | Bread, white, commercially prepared (includes soft bread crumbs) (174924) | 11 | 4 | 0 | CH | doppelt geprüft, 4 Abweichung(en) |
| Vollkornreis | Reis unpoliert, trocken (428) | Rice, brown, long-grain, raw (169703) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Zartbitterschokolade | Schokolade, dunkel (bitter) (196) | Chocolate, dark, 45- 59% cacao solids (170271) | 12 | 0 | 3 | CH | doppelt geprüft |
| Kakaopulver | Kakaopulver, ohne Zucker (581) | Cocoa, dry powder, unsweetened (169593) | 8 | 7 | 0 | CH | doppelt geprüft, 7 Abweichung(en) |
| Ahornsirup | Ahornsirup (14093) | Syrups, maple (169661) | 15 | 0 | 0 | CH | doppelt geprüft |
| Konfitüre | Konfitüre (696) | Jams and preserves (169641) | 13 | 1 | 1 | CH | doppelt geprüft, 1 Abweichung(en) |
| Sojadrink | Sojagetränk, nature (72) | Soymilk, original and vanilla, unfortified (172446) | 14 | 1 | 0 | CH | doppelt geprüft, 1 Abweichung(en) |
| Orangensaft | Orangensaft (576) | Orange juice, raw (169098) | 15 | 0 | 0 | CH | doppelt geprüft |

## Abweichungen im Einzelnen

- **Nudeln** (übernommen: CH): Ballaststoffe: CH 5.1 / USDA 3.2
- **Reis** (übernommen: CH): Calcium: CH 6 / USDA 28; Eisen: CH 0.2 / USDA 0.8
- **Kartoffeln** (übernommen: CH): Eisen: CH 0.3 / USDA 0.8
- **Süßkartoffel** (übernommen: CH): Vitamin C: CH 19.3 / USDA 2.4
- **Vollkornbrot** (übernommen: CH): Eiweiß: CH 8.6 / USDA 12.4; Fett: CH 1.3 / USDA 3.5; Calcium: CH 20 / USDA 161
- **Rote Linsen** (übernommen: CH): Ballaststoffe: CH 18.2 / USDA 10.8; Folat: CH 88 / USDA 204
- **Kichererbsen (Dose)** (übernommen: CH): Kalium: CH 330 / USDA 126
- **Kidneybohnen (Dose)** (übernommen: USDA): Ballaststoffe: CH 8.5 / USDA 5.5; Folat: CH 77 / USDA 28
- **Tofu** (übernommen: CH): Kohlenhydrate: CH 2.9 / USDA 0; Ballaststoffe: CH 0.5 / USDA 2.3; Calcium: CH 120 / USDA 683
- **Erdnussmus** (übernommen: CH): Kohlenhydrate: CH 12.5 / USDA 17; Ballaststoffe: CH 7.6 / USDA 5
- **Chiasamen** (übernommen: CH): Eiweiß: CH 21.4 / USDA 16.5; Kohlenhydrate: CH 1.8 / USDA 8
- **Kürbiskerne** (übernommen: CH): Folat: CH 129 / USDA 58
- **Milch** (übernommen: CH): Vitamin A: CH 14 / USDA 60; Vitamin D: CH 0 / USDA 1.2
- **Feta** (übernommen: CH): Kohlenhydrate: CH 0.7 / USDA 4; Vitamin B12: CH 0.41 / USDA 1.69; Calcium: CH 220 / USDA 493; Eisen: CH 0.1 / USDA 0.6; Zink: CH 1.2 / USDA 2.9
- **Mozzarella** (übernommen: CH): Kalium: CH 8 / USDA 76
- **Butter** (übernommen: CH): Vitamin D: CH 1.1 / USDA 0
- **Hähnchenbrust** (übernommen: CH): Fett: CH 1 / USDA 2.6; Vitamin D: CH 1.5 / USDA 0
- **Schinkenwürfel** (übernommen: CH): Fett: CH 2.3 / USDA 4; Vitamin C: CH 60.8 / USDA 0
- **Lachsfilet** (übernommen: CH): Vitamin A: CH 11 / USDA 58; Vitamin B12: CH 6.9 / USDA 3.23
- **Thunfisch (Dose)** (übernommen: CH): Energie: CH 109 / USDA 86; Eiweiß: CH 24.9 / USDA 19.4
- **Garnelen** (übernommen: CH): Kalium: CH 110 / USDA 264
- **Knoblauchzehe** (übernommen: USDA): Energie: CH 107 / USDA 149; Kohlenhydrate: CH 16.3 / USDA 31; Ballaststoffe: CH 5.8 / USDA 2.1; Folat: CH 26 / USDA 3; Calcium: CH 11 / USDA 181
- **Dosentomaten (gehackt)** (übernommen: CH): Calcium: CH 11 / USDA 33
- **Tomatenmark** (übernommen: CH): Folat: CH 54 / USDA 12
- **Paprika** (übernommen: CH): Vitamin A: CH 36 / USDA 157
- **Gurke** (übernommen: CH): Vitamin C: CH 8.9 / USDA 2.8
- **Karotten** (übernommen: CH): Folat: CH 59 / USDA 19
- **Spinat** (übernommen: CH): Folat: CH 94 / USDA 194
- **Champignons** (übernommen: CH): Vitamin D: CH 1.9 / USDA 0.2
- **Rucola** (übernommen: CH): Vitamin C: CH 55.5 / USDA 15
- **Lauch** (übernommen: CH): Energie: CH 32 / USDA 61; Kohlenhydrate: CH 4 / USDA 12; Vitamin A: CH 23 / USDA 83; Folat: CH 23 / USDA 64; Calcium: CH 25 / USDA 59; Eisen: CH 0.3 / USDA 2.1; Magnesium: CH 8 / USDA 28
- **Kürbis (Hokkaido)** (übernommen: CH): Ballaststoffe: CH 2.2 / USDA 0.5; Eisen: CH 0.2 / USDA 0.8
- **Mais (Dose)** (übernommen: Mittelwert): Energie: CH 105 / USDA 67; Kohlenhydrate: CH 18.2 / USDA 12
- **Erbsen (TK)** (übernommen: CH): Vitamin A: CH 22 / USDA 103
- **Ingwer** (übernommen: Mittelwert): Energie: CH 33 / USDA 80; Kohlenhydrate: CH 3.4 / USDA 16
- **Avocado** (übernommen: CH): Vitamin C: CH 3.7 / USDA 10
- **Zitrone** (übernommen: CH): Kohlenhydrate: CH 2.9 / USDA 7
- **Zimt** (übernommen: Mittelwert): Energie: CH 317 / USDA 247; Kohlenhydrate: CH 56 / USDA 27; Fett: CH 3.2 / USDA 1.2; Ballaststoffe: CH 24.4 / USDA 53.1; Eisen: CH 38 / USDA 8.3
- **Paprikapulver** (übernommen: Mittelwert): Energie: CH 358 / USDA 282; Kohlenhydrate: CH 34.9 / USDA 19; Ballaststoffe: CH 20.9 / USDA 34.9; Folat: CH 0 / USDA 49
- **Speisestärke** (übernommen: CH): Zink: CH 0.6 / USDA 0.1
- **Hefe (frisch)** (übernommen: CH): Eiweiß: CH 16.7 / USDA 8.4; Kohlenhydrate: CH 1.1 / USDA 10; Zink: CH 2.4 / USDA 10
- **Sahne** (übernommen: CH): Vitamin D: CH 0.5 / USDA 1.6
- **Frischkäse** (übernommen: USDA): Eiweiß: CH 11.1 / USDA 6.2; Vitamin B12: CH 0.6 / USDA 0.22; Folat: CH 26 / USDA 9
- **Balsamicoessig** (übernommen: Mittelwert): Energie: CH 134 / USDA 92; Kohlenhydrate: CH 27.1 / USDA 17.8
- **Senf** (übernommen: Mittelwert): Energie: CH 124 / USDA 60; Eiweiß: CH 7.1 / USDA 3.7; Fett: CH 7.7 / USDA 3.3
- **Ketchup** (übernommen: CH): Vitamin C: CH 15 / USDA 4.1; Eisen: CH 0.9 / USDA 0.4
- **Petersilie** (übernommen: CH): Energie: CH 58 / USDA 36; Kohlenhydrate: CH 7.4 / USDA 3
- **Basilikum** (übernommen: CH): Energie: CH 46 / USDA 23; Kohlenhydrate: CH 5.1 / USDA 1; Magnesium: CH 11 / USDA 64
- **Thymian** (übernommen: Mittelwert): Energie: CH 52 / USDA 101; Eiweiß: CH 1.5 / USDA 5.6; Kohlenhydrate: CH 7.3 / USDA 10; Ballaststoffe: CH 3 / USDA 14; Vitamin C: CH 0 / USDA 160.1; Folat: CH 20 / USDA 45; Magnesium: CH 36 / USDA 160; Kalium: CH 130 / USDA 609
- **Rosmarin** (übernommen: Mittelwert): Energie: CH 62 / USDA 131; Eiweiß: CH 0.8 / USDA 3.3; Fett: CH 2.5 / USDA 5.9; Ballaststoffe: CH 2.9 / USDA 14.1; Vitamin A: CH 46 / USDA 146; Folat: CH 0 / USDA 109; Magnesium: CH 36 / USDA 91; Kalium: CH 160 / USDA 668
- **Zitronensaft** (übernommen: CH): Kohlenhydrate: CH 2.6 / USDA 7.2
- **Erdbeeren** (übernommen: CH): Ballaststoffe: CH 3.8 / USDA 2
- **Himbeeren** (übernommen: CH): Ballaststoffe: CH 4.3 / USDA 6.5
- **Datteln** (übernommen: CH): Eisen: CH 2.2 / USDA 1
- **Fenchel** (übernommen: CH): Vitamin C: CH 3.3 / USDA 12; Vitamin A: CH 1 / USDA 48; Eisen: CH 0.2 / USDA 0.7
- **Staudensellerie** (übernommen: CH): Vitamin C: CH 9.8 / USDA 3.1
- **Knollensellerie** (übernommen: CH): Kohlenhydrate: CH 4 / USDA 7; Ballaststoffe: CH 3.8 / USDA 1.8; Folat: CH 39 / USDA 8
- **Rotkohl** (übernommen: CH): Vitamin A: CH 1 / USDA 56
- **Rosenkohl** (übernommen: CH): Eisen: CH 0.6 / USDA 1.4
- **Spargel** (übernommen: CH): Vitamin C: CH 14.8 / USDA 5.6; Eisen: CH 0.4 / USDA 2.1
- **Kopfsalat** (übernommen: CH): Eisen: CH 0.5 / USDA 1.2
- **Kohlrabi** (übernommen: CH): Ballaststoffe: CH 1.4 / USDA 3.6; Folat: CH 40 / USDA 16
- **Grünkohl** (übernommen: CH): Kohlenhydrate: CH 2.5 / USDA 0
- **Pastinake** (übernommen: CH): Ballaststoffe: CH 2.1 / USDA 4.9
- **Schalotte** (übernommen: CH): Folat: CH 10 / USDA 34; Calcium: CH 10 / USDA 37; Eisen: CH 0.1 / USDA 1.2; Magnesium: CH 8 / USDA 21
- **Oliven** (übernommen: CH): Energie: CH 176 / USDA 116; Kohlenhydrate: CH 0.8 / USDA 4; Fett: CH 17.2 / USDA 10.9; Ballaststoffe: CH 6.2 / USDA 1.6; Magnesium: CH 16 / USDA 4
- **Putenbrust** (übernommen: CH): Vitamin B12: CH 0.57 / USDA 1.35
- **Schweinehack** (übernommen: Mittelwert): Energie: CH 159 / USDA 263; Fett: CH 8.5 / USDA 21.2
- **Rindfleisch (Gulasch)** (übernommen: USDA): Energie: CH 97 / USDA 128; Fett: CH 1.3 / USDA 4.5
- **Speck** (übernommen: Mittelwert): Eiweiß: CH 17.8 / USDA 13.7; Fett: CH 27.6 / USDA 37.1; Vitamin C: CH 24.3 / USDA 0
- **Forelle** (übernommen: CH): Vitamin A: CH 12 / USDA 84; Vitamin D: CH 5.9 / USDA 15.9; Eisen: CH 2 / USDA 0.3
- **Räucherlachs** (übernommen: CH): Energie: CH 173 / USDA 117; Eiweiß: CH 23.2 / USDA 18.3; Fett: CH 8.9 / USDA 4.3; Vitamin D: CH 6.3 / USDA 17.1; Eisen: CH 0 / USDA 0.8; Kalium: CH 410 / USDA 175
- **Tempeh** (übernommen: Mittelwert): Fett: CH 4.7 / USDA 10.8
- **Kichererbsen (getrocknet)** (übernommen: CH): Ballaststoffe: CH 21 / USDA 12.2; Calcium: CH 120 / USDA 57
- **Linsen (braun)** (übernommen: CH): Kohlenhydrate: CH 38.8 / USDA 53; Ballaststoffe: CH 23.2 / USDA 10.7; Folat: CH 150 / USDA 479; Magnesium: CH 96 / USDA 47
- **Edamame** (übernommen: CH): Energie: CH 143 / USDA 109; Kohlenhydrate: CH 5.1 / USDA 3; Fett: CH 7.4 / USDA 4.7; Folat: CH 108 / USDA 303
- **Haselnüsse** (übernommen: CH): Kohlenhydrate: CH 10.1 / USDA 7
- **Sonnenblumenkerne** (übernommen: CH): Kohlenhydrate: CH 3.6 / USDA 11
- **Sesam** (übernommen: CH): Eiweiß: CH 23.1 / USDA 17.7; Kohlenhydrate: CH 4 / USDA 12
- **Pinienkerne** (übernommen: CH): Kohlenhydrate: CH 13 / USDA 9; Ballaststoffe: CH 6.3 / USDA 3.7
- **Kokosraspel** (übernommen: CH): Ballaststoffe: CH 24.7 / USDA 16.3
- **Hirse** (übernommen: CH): Ballaststoffe: CH 3.8 / USDA 8.5; Folat: CH 20 / USDA 85; Eisen: CH 6.9 / USDA 3
- **Buchweizen** (übernommen: CH): Ballaststoffe: CH 5.8 / USDA 10
- **Polenta (Maisgrieß)** (übernommen: CH): Folat: CH 5 / USDA 30
- **Hartweizengrieß** (übernommen: CH): Ballaststoffe: CH 6.3 / USDA 3.9; Eisen: CH 2.6 / USDA 1.2
- **Paniermehl** (übernommen: CH): Fett: CH 2.1 / USDA 5.3; Vitamin B12: CH 0 / USDA 0.35; Folat: CH 39 / USDA 107; Calcium: CH 50 / USDA 183; Eisen: CH 1.2 / USDA 4.8
- **Weißbrot** (übernommen: CH): Fett: CH 0.8 / USDA 3.3; Folat: CH 17 / USDA 111; Calcium: CH 8 / USDA 144; Eisen: CH 0.6 / USDA 3.6
- **Vollkornreis** (übernommen: CH): Folat: CH 48 / USDA 23
- **Kakaopulver** (übernommen: CH): Energie: CH 380 / USDA 228; Kohlenhydrate: CH 11.6 / USDA 21; Fett: CH 20.6 / USDA 13.7; Vitamin D: CH 2.7 / USDA 0; Folat: CH 107 / USDA 32; Eisen: CH 49 / USDA 13.9; Kalium: CH 3900 / USDA 1524
- **Konfitüre** (übernommen: CH): Eisen: CH 1.4 / USDA 0.5
- **Sojadrink** (übernommen: CH): Kohlenhydrate: CH 1.5 / USDA 6.2
