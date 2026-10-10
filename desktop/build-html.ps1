# Windows-Gegenstueck zu build-html.py: baut Kochapp.html (eine einzelne, im Browser startbare Datei)
# aus index.html, style.css und den Skripten. Ergebnis ist identisch zum Python-Skript.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$u8 = New-Object Text.UTF8Encoding($false)
function Read-Text([string]$name) { return [IO.File]::ReadAllText((Join-Path $root $name), $u8).Replace("`r`n", "`n") }

$html = Read-Text 'index.html'
$css = [regex]::Replace((Read-Text 'style.css'), '</style', '<\/style', 'IgnoreCase')
$tag = '<link rel="stylesheet" href="style.css">'
if (-not $html.Contains($tag)) { throw 'Stylesheet-Verweis in index.html nicht gefunden' }
$html = $html.Replace($tag, "<style>`n$css`n</style>")
foreach ($name in 'data.js', 'logic.js', 'order.js', 'app.js') {
  $script = [regex]::Replace((Read-Text $name), '</script', '<\/script', 'IgnoreCase')
  $ref = "<script src=`"$name`"></script>"
  if (-not $html.Contains($ref)) { throw "Skript-Verweis $name in index.html nicht gefunden" }
  $html = $html.Replace($ref, "<script>`n$script`n</script>")
}
$target = Join-Path $root 'Kochapp.html'
[IO.File]::WriteAllText($target, $html, $u8)
Write-Output "Fertig: $target ($([math]::Round((Get-Item $target).Length / 1KB)) KB)"
