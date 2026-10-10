# Baut dAIlykitchen für Windows mit dem in Windows enthaltenen C#-Compiler (.NET Framework 4.x).
# Ergebnis: Ordner dist\ mit dAIlykitchen.exe und den drei WebView2-Bibliotheken von Microsoft daneben.
# Die Oberfläche (HTML/CSS/JS) wird als Ressource in die EXE eingebettet – nach Änderungen daran neu bauen.
# Die Bibliotheken werden bewusst NICHT eingebettet: Eine EXE, die Programmbibliotheken aus sich selbst
# entpackt und lädt, meldet Windows Defender als Trojaner (Fehlalarm der Heuristik).
# Voraussetzung: desktop\lib enthält die drei DLLs aus dem NuGet-Paket Microsoft.Web.WebView2:
#   lib\net462\Microsoft.Web.WebView2.Core.dll, lib\net462\Microsoft.Web.WebView2.WinForms.dll,
#   runtimes\win-x64\native\WebView2Loader.dll
$ErrorActionPreference = 'Stop'
$app = Split-Path $PSScriptRoot -Parent
$lib = Join-Path $PSScriptRoot 'lib'
$dist = Join-Path $app 'dist'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'

$web = 'index.html', 'style.css', 'data.js', 'rezepte.js', 'bilder.js', 'logic.js', 'order.js', 'app.js', 'import-recipe.mjs'
$dlls = 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll'

$res = @()
foreach ($f in $web) {
  if (-not (Test-Path (Join-Path $app $f))) { throw "$f fehlt in $app" }
  $res += "/resource:$app\$f,web/$f"
}
foreach ($f in $dlls) { if (-not (Test-Path (Join-Path $lib $f))) { throw "$f fehlt in $lib" } }

New-Item -ItemType Directory -Force $dist | Out-Null
& $csc /nologo /target:winexe /platform:x64 /optimize+ `
  "/out:$dist\dAIlykitchen.exe" "/win32icon:$PSScriptRoot\kochapp.ico" `
  "/r:$lib\Microsoft.Web.WebView2.Core.dll" "/r:$lib\Microsoft.Web.WebView2.WinForms.dll" `
  /r:System.Net.Http.dll /r:System.Web.Extensions.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll `
  $res "$PSScriptRoot\Program.cs"
if ($LASTEXITCODE -ne 0) { throw 'Kompilieren fehlgeschlagen' }
# Läuft die App gerade aus dist\, sind die DLLs gesperrt – dann bleiben die vorhandenen liegen
foreach ($f in $dlls) { try { Copy-Item (Join-Path $lib $f) $dist -Force -ErrorAction Stop } catch { if (-not (Test-Path (Join-Path $dist $f))) { throw } } }
# REWE-Bridge (Skripte, die den Warenkorb auf rewe.de füllen) neben die EXE legen; deren Daten (.data) bleiben unberührt
$bridge = 'rewe-bridge.ps1', 'rewe-page.js', 'start-rewe-bridge.cmd', 'mappings.json', 'README.md'
New-Item -ItemType Directory -Force "$dist\rewe-bridge" | Out-Null
foreach ($f in $bridge) { Copy-Item (Join-Path $app "rewe-bridge\$f") "$dist\rewe-bridge" -Force }
Write-Output "Fertig: $dist\dAIlykitchen.exe ($([math]::Round((Get-Item "$dist\dAIlykitchen.exe").Length / 1KB)) KB) plus 3 DLLs und rewe-bridge"
