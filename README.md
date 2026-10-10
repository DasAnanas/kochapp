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

Über den Link die Datei `Kochapp.html` herunterladen und anschließend im Finder doppelklicken. Sie öffnet sich in deinem Standardbrowser. Dies ist die lokal nutzbare Version; eine öffentlich gehostete Website ist noch nicht eingerichtet.

- `Kochapp.html` herunterladen und im Finder doppelklicken (oder über „Öffnen mit“ Safari bzw. Chrome auswählen). Bei GitHub die Datei über „Download raw file“ herunterladen; die Quelltextansicht führt die App nicht aus.
- Die App läuft im Browser, ohne Installation, Node.js oder lokalen Server. HTML, CSS und JavaScript sind in dieser einen Datei enthalten. Die Schriftarten benötigen Internet; offline werden Systemschriften verwendet.
- Eigene Rezepte, Vorrat und Wochenplan werden im lokalen Speicher des verwendeten Browsers gespeichert. Verwende denselben Browser und Dateipfad, keinen privaten Modus. Daten aus der Windows-App werden nicht automatisch übernommen.
- Demo-Bestellungen und E-Mail funktionieren direkt. Eigene REST-Endpunkte müssen Browserzugriffe erlauben (CORS). Die Option „Über lokalen Proxy“ benötigt weiterhin `node server.js` und das Öffnen von `http://localhost:8080`; sie funktioniert nicht beim direkten Öffnen der HTML-Datei.
- Nach Änderungen an der Oberfläche mit `python3 desktop/build-html.py` neu bauen und die aktualisierte `Kochapp.html` mit ins Repository aufnehmen. Python wird nur zum Bauen benötigt.

Die Windows-EXE öffnet die App in einem eigenen Fenster und benötigt Windows 10/11 mit WebView2-Laufzeit (in Windows 11 enthalten).

## Desktop-App
- Oberfläche (`index.html`, `style.css`, `*.js`) und die WebView2-Bibliotheken sind in die EXE eingebettet. Die übrigen Dateien in diesem Ordner sind der Quelltext.
- **Nach Änderungen am Quelltext neu bauen:** `powershell -ExecutionPolicy Bypass -File desktop\build.ps1` (nutzt den in Windows enthaltenen C#-Compiler; die DLLs zum Einbetten liegen in `desktop\lib`).
- Eigene Rezepte, Einkaufsliste, Vorrat und Wochenplan liegen unter `%LOCALAPPDATA%\Kochapp`.
- Bestellungen an einen eigenen REST-Endpunkt sendet die App-Hülle selbst (kein CORS). `ORDER_API_URL`, `ORDER_API_KEY` und `ORDER_API_KEY_HEADER` legen Ziel und Key per Umgebungsvariable fest.
- Externe Links und `mailto:` öffnen im Standardprogramm.
- Schriftarten (Bricolage Grotesque, Manrope) werden von Google Fonts geladen; ohne Internet nutzt die App Systemschriften.
- Zum Entwickeln lässt sich `index.html` weiterhin direkt im Browser öffnen (`start.bat`/`server.js` optional mit Node.js).

## Rezeptbuch (aus dem Projekt „Küchenbuch“ übernommen)
- **Bibliothek** aller Rezepte mit Suche nach Titel oder Zutat, Kategorien und Sammlungen in der Seitenleiste.
- **Rezeptseite** mit Portionsrechner: Zutatenmengen passen sich an.
- **Eigene Rezepte** anlegen: Zutaten wie „200 g Mehl“ eintippen, Menge/Einheit werden erkannt; Titelbild optional. Eigene Rezepte erscheinen im Rezeptbuch und auf der Einkaufsliste, aber nicht im Vorrats-Finder oder Wochenplan (dafür fehlen Nährwerte).
- **Einkaufsliste** (Schublade rechts): Rezepte mit Personenzahl sammeln, Zutaten werden zusammengefasst, eigene Artikel ergänzen, abhaken, als Text herunterladen oder mit „Drucken & bestellen“ an „Vorrat & Einkauf“ übergeben.
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
