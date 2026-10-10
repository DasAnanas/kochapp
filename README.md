Link zum Rezeptbuch: [https://kochapp-rezeptbuch.readyberry.chatgpt.site](https://kochapp-rezeptbuch.readyberry.chatgpt.site)

# Kochapp – Essen organisieren

**Für den Mac: `Kochapp-macOS.zip` (native App) oder `Kochapp.html` (Browser). Für Windows: `Kochapp.exe`.** Beide Dateien enthalten die Oberfläche und können einzeln weitergegeben werden.

## Native Mac-App

**[Kochapp für macOS herunterladen](https://github.com/DasAnanas/kochapp/raw/refs/heads/codex/rezept-bearbeiten/Kochapp-macOS.zip)**

1. ZIP herunterladen und im Finder doppelklicken, um sie zu entpacken.
2. `Kochapp.app` in den Ordner „Programme“ ziehen und öffnen.

Die App öffnet ein eigenes Fenster und benötigt keinen Browser, Node.js oder Server. Sie läuft ab macOS 11.3 auf Apple Silicon und Intel. Eigene Rezepte und Einstellungen werden im persistenten WebKit-Speicher der App abgelegt; Daten aus der HTML- oder Windows-Version werden nicht automatisch übernommen.

Der Download ist lokal signiert (Ad-hoc), jedoch nicht mit einem Apple-Entwicklerzertifikat signiert oder von Apple notarisiert. macOS kann den Start deshalb blockieren. Für eine regulär freigegebene Verteilung sind ein Apple Developer Account, Signierung und Notarisierung erforderlich. Die HTML-Version bleibt als Alternative verfügbar.

Nach Änderungen mit `bash desktop/build-macos.sh` auf einem Mac neu bauen (Xcode Command Line Tools erforderlich). Das Skript erstellt beide Prozessorvarianten und verpackt die Universal-App in `Kochapp-macOS.zip`.

Eigene REST-Endpunkte müssen WebKit-Zugriffe erlauben (CORS); der lokale Bestellproxy ist in der Mac-App nicht eingebaut. Demo-Bestellungen, E-Mail, Bildauswahl, TXT-/CSV-Downloads und Drucken werden von der App unterstützt.

## Auf dem Mac im Browser öffnen

**[Kochapp herunterladen und öffnen](https://github.com/DasAnanas/kochapp/raw/refs/heads/codex/rezept-bearbeiten/Kochapp.html)**

Über den Link die Datei `Kochapp.html` herunterladen und anschließend im Finder doppelklicken. Sie öffnet sich in deinem Standardbrowser. Dies ist die lokal nutzbare Version. Die Browser-Version ohne Download ist über den Link ganz oben erreichbar.

- `Kochapp.html` herunterladen und im Finder doppelklicken (oder über „Öffnen mit“ Safari bzw. Chrome auswählen). Bei GitHub die Datei über „Download raw file“ herunterladen; die Quelltextansicht führt die App nicht aus.
- Die App läuft im Browser, ohne Installation, Node.js oder lokalen Server. HTML, CSS und JavaScript sind in dieser einen Datei enthalten. Die Schriftarten benötigen Internet; offline werden Systemschriften verwendet.
- Eigene Rezepte, Vorrat und Wochenplan werden im lokalen Speicher des verwendeten Browsers gespeichert. Verwende denselben Browser und Dateipfad, keinen privaten Modus. Daten aus der Windows-App werden nicht automatisch übernommen.
- Demo-Bestellungen und E-Mail funktionieren direkt. Eigene REST-Endpunkte müssen Browserzugriffe erlauben (CORS). Die Option „Über lokalen Proxy“ benötigt weiterhin `node server.js` und das Öffnen von `http://localhost:8080`; sie funktioniert nicht beim direkten Öffnen der HTML-Datei.
- Nach Änderungen an der Oberfläche mit `python3 desktop/build-html.py` neu bauen und die aktualisierte `Kochapp.html` mit ins Repository aufnehmen. Python wird nur zum Bauen benötigt.

Die Windows-EXE öffnet die App in einem eigenen Fenster und benötigt Windows 10/11 mit WebView2-Laufzeit (in Windows 11 enthalten).

## Desktop-App
- **Download: [Kochapp-Windows.zip (aktuelle Version)](https://github.com/DasAnanas/kochapp/releases/latest/download/Kochapp-Windows.zip)** – ZIP entpacken (Rechtsklick > „Alle extrahieren“) und `Kochapp.exe` aus dem entpackten Ordner starten. Alle Versionen unter [Releases](https://github.com/DasAnanas/kochapp/releases).
- Der Ordner enthält `Kochapp.exe`, drei WebView2-Bibliotheken von Microsoft (`*.dll`) und den Ordner `rewe-bridge`; alles muss zusammen liegen bleiben. Zum Weitergeben den ganzen Ordner bzw. die ZIP-Datei verwenden.
- Die Oberfläche (`index.html`, `style.css`, `*.js`) ist in die EXE eingebettet. Die Bibliotheken sind es bewusst nicht: Eine EXE, die Programmbibliotheken aus sich selbst entpackt, meldet Windows Defender als Trojaner (Fehlalarm, so geschehen bei Version 1.0.0).
- Dieses Repository enthält nur den Quelltext; die fertige App liegt als Release-Download vor (so kollidieren parallele Änderungen nicht an einer Binärdatei).
- **Neue Version veröffentlichen:** `powershell -ExecutionPolicy Bypass -File desktop\release.ps1` baut die App aus dem aktuellen `main` und lädt sie als neues GitHub-Release hoch (benötigt Git und die angemeldete GitHub-CLI `gh`).
- Das Fenster- und Programmsymbol (Kochtopf) liegt als `desktop\kochapp.ico` vor; `desktop\make-icon.ps1` zeichnet es neu.
- **Lokal bauen (zum Ausprobieren):** `powershell -ExecutionPolicy Bypass -File desktop\build.ps1` erzeugt den Ordner `dist` mit `Kochapp.exe` und den DLLs (nutzt den in Windows enthaltenen C#-Compiler; die DLLs liegen in `desktop\lib`).
- Eigene Rezepte, Einkaufsliste, Vorrat und Wochenplan liegen unter `%LOCALAPPDATA%\Kochapp`.
- Bestellungen an einen eigenen REST-Endpunkt sendet die App-Hülle selbst (kein CORS). `ORDER_API_URL`, `ORDER_API_KEY` und `ORDER_API_KEY_HEADER` legen Ziel und Key per Umgebungsvariable fest.
- Externe Links und `mailto:` öffnen im Standardprogramm.
- Schriftarten (Bricolage Grotesque, Manrope) werden von Google Fonts geladen; ohne Internet nutzt die App Systemschriften.
- Zum Entwickeln lässt sich `index.html` weiterhin direkt im Browser öffnen (`start.bat`/`server.js` optional mit Node.js).

## Bei REWE bestellen
- In der Einkaufsliste (Schublade) **„Bei REWE bestellen“** oder unter „Vorrat & Einkauf“ **„Bei REWE in den Warenkorb …“** klicken. Die App fragt nach der **Postleitzahl** (und Liefer- oder Abholservice), wählt den passenden REWE-Markt, legt die Artikel der Liste in den Warenkorb auf rewe.de und holt das REWE-Fenster mit dem Warenkorb nach vorn.
- **Es wird nie automatisch bestellt.** Warenkorb prüfen, Liefertermin wählen und die Bestellung abschließen macht der Mensch selbst auf rewe.de.
- Technik: Der Ordner `rewe-bridge` (liegt neben `Kochapp.exe`) enthält eine kleine lokale Schnittstelle, die ein eigenes Chrome- bzw. Edge-Fenster steuert. Die Windows-App startet sie bei Bedarf selbst (es erscheinen ein Konsolenfenster und das REWE-Fenster) und setzt den API-Schlüssel automatisch. Wer sich in diesem REWE-Fenster einmal anmeldet, bleibt dort angemeldet. Details: `rewe-bridge/README.md`.
- Für jeden Artikel wird das erste lieferbare Suchergebnis genommen und die Menge auf ganze Packungen aufgerundet; nach dem Füllen zeigt die App je Artikel, welches Produkt gewählt wurde und was nicht gefunden wurde. Feste Produkte lassen sich in `rewe-bridge/mappings.json` hinterlegen.
- rewe.de hat keine öffentliche Schnittstelle; die Bridge nutzt dieselben Aufrufe wie der Shop im Browser. Ändert REWE diese, funktioniert das Füllen nicht mehr, bis `rewe-bridge/rewe-page.js` angepasst ist. In der Browser-Version (`Kochapp.html`) muss die Bridge von Hand gestartet und ihr API-Schlüssel eingetragen werden; auf dem Mac gibt es sie nicht (PowerShell-Skript).

## Rezeptbuch (aus dem Projekt „Küchenbuch“ übernommen)
- **Bibliothek** aller Rezepte mit Suche nach Titel oder Zutat, Kategorien und Sammlungen in der Seitenleiste.
- **Rezeptseite** mit Portionsrechner: Zutatenmengen passen sich an.
- **Eigene Rezepte** anlegen: Zutaten wie „200 g Mehl“ eintippen, Menge/Einheit werden erkannt; Titelbild optional. Zutaten, deren Name in der Lebensmittelliste steht (wie bei „Mein Vorrat“) und die eine Menge in g, ml oder Stk haben, werden mit Nährwerten verknüpft; die Eingabe zeigt das sofort an.
- **Eigene Rezepte in Finder und Wochenplan:** Rezepte mit mindestens einer verknüpften Zutat stehen auch im Vorrats-Finder und im Wochenplan zur Verfügung. Mit dem Schalter **„Nur meine eigenen Rezepte verwenden“** (Präferenzen) arbeiten beide ausschließlich mit ihnen. Nicht verknüpfte Zutaten zählen nicht für Nährwerte und Vorrat, landen aber auf der Einkaufsliste; solche Rezepte werden bei aktiver Ernährungsform (vegan, glutenfrei …) vorsichtshalber ausgelassen.
- **Einkaufsliste** (Schublade rechts, über „Einkaufsliste“ in der Seitenleiste): Rezepte mit Personenzahl sammeln, Zutaten werden zusammengefasst, eigene Artikel ergänzen, abhaken, als Text herunterladen oder mit „Drucken & bestellen“ an „Vorrat & Einkauf“ übergeben.
- **Foto-Scan und Linkimport sind Demos** mit festem Beispielrezept – es findet keine Texterkennung und kein Webabruf statt.

## Funktionen
1. **Profil** – Ernährungsformen als frei kombinierbare Toggles (vegan, vegetarisch, pescetarisch, glutenfrei, laktosefrei, nussfrei, eifrei, sojafrei, sesamfrei, halal, low carb, high protein), Ausschlüsse (Freitext), max. Zubereitungszeit, max. Schwierigkeit, Personenzahl, Mahlzeiten pro Tag, optionale Körperdaten.
2. **Vorrat & Rezepte** – Lebensmittel mit Menge eintragen. Die App rankt Rezepte nach Vorrat-Nutzung, schlägt die *beste Kombination* mehrerer Gerichte vor und erstellt die **Einkaufsliste für die Reste**. „Gekocht“ zieht den Verbrauch vom Vorrat ab.
3. **Wochenplan** – 7 Tage, optimiert auf Energie, Makros und 10 Mikronährstoffe (Wochendurchschnitt). Pro Mahlzeit: 🎲 Reroll, ⇄ Swap (Alternativen mit Bewertung), 🔒 Sperren. Ohne Körperdaten wird mit 2.000 kcal-Referenz geplant. Einkaufsliste optional abzüglich Vorrat.
4. **Einkauf & Bestellung** – Liste abhaken/bearbeiten, kopieren, CSV, drucken, bestellen.

## Bestell-Schnittstelle (`order.js`)
Adapter-Modell (`KA.Providers`):
- **Demo-Shop** – simulierte Bestellung.
- **Eigener REST-Endpunkt** – sendet JSON (Artikel, Mengen, Einheiten, Schätzpreis, Lieferadresse) per POST/PUT mit konfigurierbarem Auth-Header. „Über lokalen Proxy“ leitet via `server.js` weiter (CORS-frei). Mit Umgebungsvariablen `ORDER_API_URL`, `ORDER_API_KEY`, `ORDER_API_KEY_HEADER` bleibt der Key serverseitig.
- **E-Mail** – öffnet das Mailprogramm mit der Liste.

Einen konkreten Händler anbinden: in `KA.Providers` einen Eintrag mit `fields`, `preview()` und `submit()` ergänzen und dort das Payload auf das API-Format des Händlers abbilden. Hinweis: Die meisten Supermärkte bieten keine offene Bestell-API; ein eigener Zwischen-Endpunkt oder ein Partnerzugang ist meist nötig.

## Dateien
`index.html` · `style.css` · `data.js` (50 Rezepte, 76 Lebensmittel, Nährwerte) · `logic.js` (Filter, Finder, Planer) · `app.js` (UI) · `order.js` · `server.js` · `start.bat` · `desktop\Program.cs` · `desktop\build.ps1` · `desktop\release.ps1` · `desktop\lib` (WebView2-DLLs, werden mit ausgeliefert)

## Nährwerte aus den Zutaten
- Die Rezeptseite zeigt die **Nährwerte pro Portion** (Energie, 4 Makro- und 10 Mikronährstoffe, jeweils mit Anteil am Tagesbedarf). Sie werden aus den Zutaten zusammengerechnet – bei mitgelieferten und bei eigenen Rezepten.
- Eigene Zutaten werden beim Eintippen einem Lebensmittel zugeordnet, auch mit anderen Namen („Möhren“, „rote Zwiebel“, „Weißweinessig“) und Haushaltsmaßen (EL, TL, Prise, Bund, Dose, Becher, Stück). Die Vorschau zeigt, welches Lebensmittel und welche Menge erkannt wurde. Haushaltsmaße sind Näherungen.
- Nicht erkannte Zutaten gehen nicht in die Rechnung ein; die Rezeptseite nennt sie ausdrücklich.
- **Datenquellen:** Schweizer Nährwertdatenbank V 7.1 (Bundesamt für Lebensmittelsicherheit und Veterinärwesen BLV, https://naehrwertdaten.ch) und USDA FoodData Central, SR Legacy (https://fdc.nal.usda.gov). Jeder Wert der 154 Lebensmittel wurde in beiden Datenbanken nachgeschlagen und verglichen; das Ergebnis steht in `tools/naehrwerte/PRUEFBERICHT.md`.
- Neu erzeugen: `tools\naehrwerte\fetch.ps1 -Out <Ordner>` lädt beide Datenbanken, `tools\naehrwerte\verify.ps1 -Data <Ordner> -Apply` vergleicht und trägt die Werte in `data.js` ein. Die Zuordnung der Lebensmittel steht in `tools\naehrwerte\foods.tsv`.

## Hinweise
Nährwerte und Preise sind gerundete Näherungswerte, keine Ernährungsberatung. Vitamin D (und bei veganer Kost B12) werden im Plan ehrlich als Lücke angezeigt.
