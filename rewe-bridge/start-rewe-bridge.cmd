@echo off
rem Startet die REWE-Bridge (lokale API auf http://localhost:8765). Fenster offen lassen.
rem Die Kochapp startet diese Datei selbst im Hintergrund (KOCHAPP_BACKGROUND=1, ohne Fenster und ohne "pause").
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rewe-bridge.ps1" %*
if not "%KOCHAPP_BACKGROUND%"=="1" pause
