@echo off
rem Startet die REWE-Bridge (lokale API auf http://localhost:8765). Fenster offen lassen.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rewe-bridge.ps1" %*
pause
