# Baut Kochapp.exe aus dem aktuellen main und veröffentlicht sie als GitHub-Release.
# Die EXE liegt nicht im Repository; der Download-Link in der README zeigt immer auf das neueste Release.
#   powershell -ExecutionPolicy Bypass -File desktop\release.ps1              (Version = Datum und Uhrzeit)
#   powershell -ExecutionPolicy Bypass -File desktop\release.ps1 -Tag v1.2.0  (eigene Versionsnummer)
# Voraussetzungen: Git und GitHub-CLI (gh) installiert, gh mit Schreibrecht angemeldet.
param(
  [string]$Tag = 'v' + (Get-Date -Format 'yyyy.MM.dd-HHmm'),
  [string]$Notes = ''
)
$ErrorActionPreference = 'Stop'
$app = Split-Path $PSScriptRoot -Parent
Set-Location $app

foreach ($tool in 'git', 'gh') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool wurde nicht gefunden (installieren bzw. in den PATH aufnehmen)." }
}

# Nur veröffentlichen, was auch auf GitHub in main steht – sonst passt die EXE nicht zum Quelltext des Releases
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'main') { throw "Bitte zuerst auf main wechseln (aktuell: $branch)." }
if (git status --porcelain) { throw 'Es gibt nicht committete Änderungen. Bitte erst committen oder verwerfen.' }
git fetch --quiet origin main
if ((git rev-parse HEAD) -ne (git rev-parse origin/main)) { throw 'Lokales main und origin/main unterscheiden sich. Bitte erst pullen bzw. pushen.' }

& powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\build.ps1"
if ($LASTEXITCODE -ne 0) { throw 'Build fehlgeschlagen' }

$commit = git rev-parse HEAD
if (-not $Notes) { $Notes = "Kochapp für Windows 10/11. Einzelne Datei, keine Installation: Kochapp.exe herunterladen und starten.`n`nGebaut aus Commit $commit." }
gh release create $Tag "$app\Kochapp.exe" --target $commit --title "Kochapp $Tag" --notes $Notes --latest
if ($LASTEXITCODE -ne 0) { throw 'Release konnte nicht angelegt werden' }
Write-Output "Veröffentlicht: $Tag"
