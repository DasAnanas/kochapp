# Lädt die beiden Nährwert-Datenbanken und bereitet sie als ch.tsv und usda.tsv auf (Eingabe für verify.ps1).
#   powershell -ExecutionPolicy Bypass -File tools\naehrwerte\fetch.ps1 -Out C:\Temp\naehrwerte
# Quellen:
#   Schweizer Nährwertdatenbank (BLV) – https://naehrwertdaten.ch/de/downloads/  (Nutzung mit Quellenvermerk erlaubt)
#   USDA FoodData Central, SR Legacy – https://fdc.nal.usda.gov/download-datasets  (gemeinfrei)
# Die Adresse der Schweizer Excel-Datei ändert sich mit jeder Version; bei Bedarf -ChUrl anpassen.
param(
  [Parameter(Mandatory)][string]$Out,
  [string]$ChUrl = 'https://naehrwertdaten.ch/wp-content/uploads/2026/07/Schweizer_Nahrwertdatenbank.xlsx',
  [string]$UsdaUrl = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$inv = [Globalization.CultureInfo]::InvariantCulture
$u8 = New-Object Text.UTF8Encoding($false)
New-Item -ItemType Directory -Force $Out | Out-Null
$keys = 'kcal', 'prot', 'carb', 'fat', 'fiber', 'vitC', 'vitA', 'vitD', 'b12', 'folat', 'ca', 'fe', 'mg', 'zn', 'k'

Invoke-WebRequest $ChUrl -OutFile "$Out\ch.zip" -UserAgent 'Mozilla/5.0'
Invoke-WebRequest $UsdaUrl -OutFile "$Out\usda.zip" -UserAgent 'Mozilla/5.0'
Expand-Archive "$Out\ch.zip" "$Out\ch" -Force
Expand-Archive "$Out\usda.zip" "$Out\usda" -Force

# ---- Schweizer Nährwertdatenbank: erstes Tabellenblatt der Excel-Datei lesen ----
$ss = [xml][IO.File]::ReadAllText("$Out\ch\xl\sharedStrings.xml", [Text.Encoding]::UTF8)
$strings = @($ss.sst.si | ForEach-Object { if ($_.t -is [string]) { $_.t } elseif ($_.t) { $_.t.'#text' } else { ($_.r | ForEach-Object { if ($_.t -is [string]) { $_.t } else { $_.t.'#text' } }) -join '' } })
function ColIdx([string]$ref) { $n = 0; foreach ($ch in $ref.ToCharArray()) { if ($ch -ge 'A' -and $ch -le 'Z') { $n = $n * 26 + ([int]$ch - 64) } }; return $n - 1 }
$sheet = [xml][IO.File]::ReadAllText("$Out\ch\xl\worksheets\sheet1.xml", [Text.Encoding]::UTF8)
$table = foreach ($row in $sheet.worksheet.sheetData.row) {
  $cells = @{}; $max = -1
  foreach ($c in $row.c) {
    $i = ColIdx $c.r; if ($i -gt $max) { $max = $i }
    $v = $c.v; if ($c.t -eq 's') { $v = $strings[[int]$v] } elseif ($c.t -eq 'inlineStr') { $v = $c.is.t }
    $cells[$i] = ([string]$v) -replace "[\t\r\n]+", ' '
  }
  , @(for ($i = 0; $i -le $max; $i++) { if ($cells.ContainsKey($i)) { $cells[$i] } else { '' } })
}
$h = $table[2]
$pat = @{ kcal = '^Energie, Kilokalorien'; prot = '^Protein \(g\)'; carb = '^Kohlenhydrate, verf'; fat = '^Fett, total'; fiber = '^Nahrungsfasern'
  vitC = '^Vitamin C'; vitA = '^Vitamin A-Aktivit.t, RAE'; vitD = '^Vitamin D'; b12 = '^Vitamin B12'; folat = '^Folat'; ca = '^Calcium'; fe = '^Eisen'; mg = '^Magnesium'; zn = '^Zink'; k = '^Kalium' }
$col = @{}
foreach ($k in $keys) { $m = @(0..($h.Count - 1) | Where-Object { $h[$_] -match $pat[$k] }); if ($m.Count -ne 1) { throw "Spalte $k nicht eindeutig ($($m.Count) Treffer)" }; $col[$k] = $m[0] }
$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine(("id`tname`tsyn`tcat`tbasis`t" + ($keys -join "`t")))
for ($i = 3; $i -lt $table.Count; $i++) {
  $c = $table[$i]; if ($c.Count -lt 20 -or -not $c[0]) { continue }
  $vals = foreach ($k in $keys) { $v = $c[$col[$k]].TrimStart('<'); $d = 0.0; if ([double]::TryParse($v, [Globalization.NumberStyles]::Float, $inv, [ref]$d)) { [Math]::Round($d, 3).ToString($inv) } else { '' } }
  [void]$sb.AppendLine((@($c[0], $c[3], $c[4], $c[5], $c[7]) + $vals -join "`t"))
}
[IO.File]::WriteAllText("$Out\ch.tsv", $sb.ToString(), $u8)

# ---- USDA SR Legacy: Nährstoffe je Lebensmittel einsammeln ----
$u = Get-ChildItem "$Out\usda" -Directory | Select-Object -First 1
# Kohlenhydrate (1005) sind bei USDA "by difference" inkl. Ballaststoffe -> verfügbare KH = 1005 - 1079
$nid = @{ '1008' = 'kcal'; '1003' = 'prot'; '1005' = 'carbT'; '1004' = 'fat'; '1079' = 'fiber'; '1162' = 'vitC'; '1106' = 'vitA'; '1114' = 'vitD'; '1178' = 'b12'; '1177' = 'folat'; '1087' = 'ca'; '1089' = 'fe'; '1090' = 'mg'; '1095' = 'zn'; '1092' = 'k' }
$food = @{}
foreach ($line in [IO.File]::ReadLines("$($u.FullName)\food_nutrient.csv")) {
  $p = $line.Replace('"', '').Split(',')
  if ($p.Count -lt 4) { continue }
  $key = $nid[$p[2]]; if (-not $key) { continue }
  if (-not $food.ContainsKey($p[1])) { $food[$p[1]] = @{} }
  $food[$p[1]][$key] = $p[3]
}
$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine(("id`tname`t" + ($keys -join "`t")))
Import-Csv "$($u.FullName)\food.csv" | ForEach-Object {
  $f = $food[$_.fdc_id]; if (-not $f) { return }
  $vals = foreach ($k in $keys) {
    if ($k -eq 'carb') { if ($f.carbT) { $fi = 0.0; if ($f.fiber) { $fi = [double]::Parse($f.fiber, $inv) }; [Math]::Round([Math]::Max(0, [double]::Parse($f.carbT, $inv) - $fi), 2).ToString($inv) } else { '' } }
    elseif ($f[$k]) { $f[$k] } else { '' }
  }
  [void]$sb.AppendLine((@($_.fdc_id, $_.description) + $vals -join "`t"))
}
[IO.File]::WriteAllText("$Out\usda.tsv", $sb.ToString(), $u8)
"Fertig: $Out\ch.tsv ($(([IO.File]::ReadAllLines("$Out\ch.tsv").Count - 1)) Einträge), $Out\usda.tsv ($(([IO.File]::ReadAllLines("$Out\usda.tsv").Count - 1)) Einträge)"
