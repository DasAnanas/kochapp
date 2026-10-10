# Kochapp – Essen organisieren

**Das Ergebnis ist eine einzige Datei: `Kochapp.exe`.** Doppelklick öffnet die App in einem eigenen Fenster – kein Browser, kein Server, keine Installation. Die EXE läuft für sich allein und kann einzeln kopiert oder weitergegeben werden (Windows 10/11 mit WebView2-Laufzeit, in Windows 11 enthalten).

## Desktop-App
- Oberfläche (`index.html`, `style.css`, `*.js`) und die WebView2-Bibliotheken sind in die EXE eingebettet. Die übrigen Dateien in diesem Ordner sind der Quelltext.
- Das Fenster- und Programmsymbol (Kochtopf) liegt als `desktop\kochapp.ico` vor; `desktop\make-icon.ps1` zeichnet es neu.
- **Nach Änderungen am Quelltext neu bauen:** `powershell -ExecutionPolicy Bypass -File desktop\build.ps1` (nutzt den in Windows enthaltenen C#-Compiler; die DLLs zum Einbetten liegen in `desktop\lib`).
- Eigene Rezepte, Einkaufsliste, Vorrat und Wochenplan liegen unter `%LOCALAPPDATA%\Kochapp`.
- Bestellungen an einen eigenen REST-Endpunkt sendet die App-Hülle selbst (kein CORS). `ORDER_API_URL`, `ORDER_API_KEY` und `ORDER_API_KEY_HEADER` legen Ziel und Key per Umgebungsvariable fest.
- Externe Links und `mailto:` öffnen im Standardprogramm.
- Schriftarten (Bricolage Grotesque, Manrope) werden von Google Fonts geladen; ohne Internet nutzt die App Systemschriften.
- Zum Entwickeln lässt sich `index.html` weiterhin direkt im Browser öffnen (`start.bat`/`server.js` optional mit Node.js).

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
`index.html` · `style.css` · `data.js` (50 Rezepte, 76 Lebensmittel, Nährwerte) · `logic.js` (Filter, Finder, Planer) · `app.js` (UI) · `order.js` · `server.js` · `start.bat` · `Kochapp.exe` · `desktop\Program.cs` · `desktop\build.ps1` · `desktop\lib` (WebView2-DLLs zum Einbetten)

## Hinweise
Nährwerte und Preise sind gerundete Näherungswerte, keine Ernährungsberatung. Vitamin D (und bei veganer Kost B12) werden im Plan ehrlich als Lücke angezeigt.
