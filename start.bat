@echo off
REM Startet den lokalen Server (benoetigt Node.js) und oeffnet die App.
REM Ohne Node.js: einfach index.html per Doppelklick oeffnen (Demo-Bestellung funktioniert trotzdem).
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nicht gefunden - oeffne index.html direkt.
  start "" "%~dp0index.html"
  exit /b
)
start "" http://localhost:8080
node "%~dp0server.js"
