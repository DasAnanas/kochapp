# Baut die eigenständige Kochapp.exe mit dem in Windows enthaltenen C#-Compiler (.NET Framework 4.x).
# Oberfläche (HTML/CSS/JS) und WebView2-Bibliotheken werden als Ressourcen in die EXE eingebettet –
# nach jeder Änderung an diesen Dateien also neu bauen.
# Voraussetzung: desktop\lib enthält die drei DLLs aus dem NuGet-Paket Microsoft.Web.WebView2:
#   lib\net462\Microsoft.Web.WebView2.Core.dll, lib\net462\Microsoft.Web.WebView2.WinForms.dll,
#   runtimes\win-x64\native\WebView2Loader.dll
$ErrorActionPreference = 'Stop'
$app = Split-Path $PSScriptRoot -Parent
$lib = Join-Path $PSScriptRoot 'lib'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'

$web = 'index.html', 'style.css', 'data.js', 'rezepte.js', 'bilder.js', 'logic.js', 'order.js', 'app.js'
$dlls = 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll'

$res = @()
foreach ($f in $web) {
  if (-not (Test-Path (Join-Path $app $f))) { throw "$f fehlt in $app" }
  $res += "/resource:$app\$f,web/$f"
}
foreach ($f in $dlls) {
  if (-not (Test-Path (Join-Path $lib $f))) { throw "$f fehlt in $lib" }
  $res += "/resource:$lib\$f,lib/$f"
}

& $csc /nologo /target:winexe /platform:x64 /optimize+ `
  "/out:$app\Kochapp.exe" `
  "/r:$lib\Microsoft.Web.WebView2.Core.dll" "/r:$lib\Microsoft.Web.WebView2.WinForms.dll" `
  /r:System.Net.Http.dll /r:System.Web.Extensions.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll `
  $res "$PSScriptRoot\Program.cs"
if ($LASTEXITCODE -ne 0) { throw 'Kompilieren fehlgeschlagen' }
Write-Output "Fertig: $app\Kochapp.exe ($([math]::Round((Get-Item "$app\Kochapp.exe").Length / 1KB)) KB)"
