# Vergleicht die Nährwerte jedes Lebensmittels aus foods.tsv in zwei unabhängigen Quellen
# (Schweizer Nährwertdatenbank, USDA FoodData Central SR Legacy), schreibt den Prüfbericht
# und trägt die Werte mit -Apply in data.js ein.
#   -Data   Ordner mit ch.tsv und usda.tsv (erzeugt von fetch.ps1)
# Regel je Nährstoff: Stimmen beide Quellen innerhalb der Toleranz überein -> Wert der Schweizer DB
# (europäische Lebensmittel). Weichen sie ab -> Schweizer Wert, im Bericht als Abweichung markiert.
# Gibt es nur eine Quelle -> deren Wert, als "nur eine Quelle" markiert.
param([Parameter(Mandatory)][string]$Data, [switch]$Apply)
$ErrorActionPreference = 'Stop'
$inv = [Globalization.CultureInfo]::InvariantCulture
$u8 = New-Object Text.UTF8Encoding($false)
$here = $PSScriptRoot
$app = Split-Path (Split-Path $here -Parent) -Parent

$keys = 'kcal', 'prot', 'carb', 'fat', 'fiber', 'vitC', 'vitA', 'vitD', 'b12', 'folat', 'ca', 'fe', 'mg', 'zn', 'k'
$label = 'Energie', 'Eiweiß', 'Kohlenhydrate', 'Fett', 'Ballaststoffe', 'Vitamin C', 'Vitamin A', 'Vitamin D', 'Vitamin B12', 'Folat', 'Calcium', 'Eisen', 'Magnesium', 'Zink', 'Kalium'
$digits = 0, 1, 1, 1, 1, 1, 0, 1, 2, 0, 0, 1, 0, 1, 0
# Toleranz: relative Abweichung ODER absolute Abweichung darf unterschritten sein
$rel = 0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5
$abs = 15, 1.5, 2, 1.5, 1.5, 5, 30, 0.5, 0.3, 15, 15, 0.5, 10, 0.4, 60

function Num([string]$s) { $d = 0.0; if ($s -ne '' -and [double]::TryParse($s, [Globalization.NumberStyles]::Float, $inv, [ref]$d)) { return $d }; return $null }
function Fmt($v, [int]$dg) { return ([Math]::Round([double]$v, $dg)).ToString($inv) }

$ch = @{}
foreach ($l in ([IO.File]::ReadAllLines("$Data\ch.tsv", [Text.Encoding]::UTF8) | Select-Object -Skip 1)) { $c = $l.Split("`t"); $ch[$c[0]] = $c }
$us = @{}
$suffix = " (Includes foods for USDA's Food Distribution Program)"
foreach ($l in ([IO.File]::ReadAllLines("$Data\usda.tsv", [Text.Encoding]::UTF8) | Select-Object -Skip 1)) { $c = $l.Split("`t"); $us[$c[1].Replace($suffix, '').ToLower()] = $c }

# vorhandene Werte aus data.js (für Lebensmittel ohne Quelle und für den Vorher/Nachher-Vergleich)
$js = [IO.File]::ReadAllText("$app\data.js", $u8)
$old = @{}
# der generierte Block (neue Lebensmittel) wird jedes Mal neu geschrieben und zählt hier nicht als Bestand
$rxBlock = New-Object regex '  // >>> generiert[\s\S]*?// <<< generiert'
foreach ($m in [regex]::Matches($rxBlock.Replace($js, ''),"\n\s*\['([a-z_]+)', '([^']+)', '[A-Z]{2}', '(g|ml|Stk)',[^\n]*?\[([0-9., ]+)\](?:, true)?\],")) {
  $old[$m.Groups[1].Value] = @{ name = $m.Groups[2].Value; unit = $m.Groups[3].Value; n = @($m.Groups[4].Value.Split(',') | ForEach-Object { [double]::Parse($_.Trim(), $inv) }) }
}

$rows = [IO.File]::ReadAllLines("$here\foods.tsv", [Text.Encoding]::UTF8)
$head = $rows[0].Split("`t")
$foods = foreach ($r in ($rows | Select-Object -Skip 1)) { if (-not $r.Trim()) { continue }; $c = $r.Split("`t"); $o = @{}; for ($i = 0; $i -lt $head.Count; $i++) { $o[$head[$i]] = if ($i -lt $c.Count) { $c[$i] } else { '' } }; $o }

$report = New-Object Text.StringBuilder
$detail = New-Object Text.StringBuilder
$stat = @{ ok = 0; diff = 0; single = 0; none = 0 }
$macroDiff = New-Object Collections.ArrayList
$result = @{}
$summaryRows = New-Object Collections.ArrayList

foreach ($f in $foods) {
  $id = $f.id
  $isNew = -not $old.ContainsKey($id)
  $unit = if ($isNew) { $f.unit } else { $old[$id].unit }
  $name = if ($isNew) { $f.name } else { $old[$id].name }
  $dens = Num $f.dens; if ($unit -ne 'ml' -or $null -eq $dens) { $dens = 1.0 }
  $c = if ($f.ch) { $ch[$f.ch] } else { $null }
  if ($f.ch -and -not $c) { throw "Schweizer ID $($f.ch) für $id nicht gefunden" }
  $u = if ($f.usda) { $us[$f.usda.ToLower()] } else { $null }
  if ($f.usda -and -not $u) { throw "USDA-Eintrag '$($f.usda)' für $id nicht gefunden" }
  # Schweizer Werte sind bei Getränken teils je 100 ml angegeben
  $chFactor = if ($c -and $c[4] -match 'ml') { 1.0 } else { $dens }
  $vals = @(); $marks = @(); $cnt = @{ ok = 0; diff = 0; single = 0; none = 0 }
  for ($i = 0; $i -lt $keys.Count; $i++) {
    $a = if ($c) { Num $c[5 + $i] } else { $null }; if ($null -ne $a) { $a = $a * $chFactor }
    $b = if ($u) { Num $u[2 + $i] } else { $null }; if ($null -ne $b) { $b = $b * $dens }
    $state = 'none'; $v = if ($isNew) { 0.0 } else { $old[$id].n[$i] }
    if ($null -ne $a -and $null -ne $b) {
      $d = [Math]::Abs($a - $b); $mx = [Math]::Max([Math]::Abs($a), [Math]::Abs($b))
      $state = if ($d -le $abs[$i] -or ($mx -gt 0 -and $d / $mx -le $rel[$i])) { 'ok' } else { 'diff' }
      $v = if ($f.pick -eq 'usda') { $b } elseif ($f.pick -eq 'avg') { ($a + $b) / 2 } else { $a }
    } elseif ($null -ne $a) { $state = 'single'; $v = $a }
    elseif ($null -ne $b) { $state = 'single'; $v = $b }
    $cnt[$state]++; $stat[$state]++
    $vals += [Math]::Round($v, $digits[$i])
    if ($state -eq 'diff') {
      $marks += "$($label[$i]): CH $(Fmt $a $digits[$i]) / USDA $(Fmt $b $digits[$i])"
      if ($i -le 4) { [void]$macroDiff.Add("$name – $($label[$i]): CH $(Fmt $a $digits[$i]) / USDA $(Fmt $b $digits[$i])") }
    }
  }
  $result[$id] = $vals
  $srcN = [int][bool]$c + [int][bool]$u
  $status = if ($srcN -eq 2) { if ($cnt.diff -eq 0) { 'doppelt geprüft' } else { "doppelt geprüft, $($cnt.diff) Abweichung(en)" } } elseif ($srcN -eq 1) { 'nur eine Quelle' } else { 'ungeprüft (Schätzwert)' }
  $taken = if ($srcN -eq 2) { if ($f.pick -eq 'usda') { 'USDA' } elseif ($f.pick -eq 'avg') { 'Mittelwert' } else { 'CH' } } elseif ($c) { 'CH' } elseif ($u) { 'USDA' } else { '–' }
  [void]$summaryRows.Add("| $name | $(if ($c) { $c[1] + ' (' + $c[0] + ')' } else { '–' }) | $(if ($u) { $u[1].Replace($suffix, '') + ' (' + $u[0] + ')' } else { '–' }) | $($cnt.ok) | $($cnt.diff) | $($cnt.single) | $taken | $status |")
  if ($marks.Count) { [void]$detail.AppendLine("- **$name** (übernommen: $taken): " + ($marks -join '; ')) }
}

$two = @($foods | Where-Object { $_.ch -and $_.usda }).Count
$one = @($foods | Where-Object { ($_.ch -and -not $_.usda) -or ($_.usda -and -not $_.ch) }).Count
$zero = @($foods | Where-Object { -not $_.ch -and -not $_.usda }).Count
[void]$report.AppendLine('# Prüfbericht Nährwerte')
[void]$report.AppendLine('')
[void]$report.AppendLine('Erzeugt von `tools/naehrwerte/verify.ps1` – nicht von Hand ändern.')
[void]$report.AppendLine('')
[void]$report.AppendLine('**Quellen**')
[void]$report.AppendLine('- Schweizer Nährwertdatenbank V 7.1, Bundesamt für Lebensmittelsicherheit und Veterinärwesen (BLV), https://naehrwertdaten.ch')
[void]$report.AppendLine('- USDA FoodData Central, SR Legacy (2018-04), U.S. Department of Agriculture, https://fdc.nal.usda.gov')
[void]$report.AppendLine('')
[void]$report.AppendLine('**Vorgehen:** Jedes Lebensmittel wurde je einem Eintrag beider Datenbanken zugeordnet (`foods.tsv`). Für jeden der 15 Nährstoffe werden beide Werte verglichen. Übernommen wird der Schweizer Wert; fehlt er, der USDA-Wert. Wo die Abweichungen bei den Makronährstoffen von Hand geprüft wurden und der Schweizer Eintrag ein anderes Produkt beschreibt als hierzulande üblich, ist in `foods.tsv` (Spalte `pick`) stattdessen der USDA-Wert oder der Mittelwert beider Quellen gewählt; die Spalte „übernommen“ zeigt das an. Als Übereinstimmung gilt eine Abweichung von höchstens 20 % (Ballaststoffe 30 %, Vitamine und Mineralstoffe 50 %) oder eine kleine absolute Differenz. Kohlenhydrate sind verfügbare Kohlenhydrate (USDA: Gesamtkohlenhydrate minus Ballaststoffe). Bei Flüssigkeiten sind die Werte mit der Dichte auf 100 ml umgerechnet.')
[void]$report.AppendLine('')
[void]$report.AppendLine("**Ergebnis:** $($foods.Count) Lebensmittel – $two mit zwei Quellen, $one mit nur einer Quelle, $zero ohne Quelle (Schätzwert bleibt). Von $($foods.Count * 15) Einzelwerten stimmen $($stat.ok) in beiden Quellen überein, $($stat.diff) weichen ab, $($stat.single) stammen aus nur einer Quelle, $($stat.none) haben keine Quelle.")
[void]$report.AppendLine('')
[void]$report.AppendLine('Abweichungen bei Vitaminen und Mineralstoffen sind zwischen Datenbanken üblich (Sorte, Anbau, Messmethode, Anreicherung).')
[void]$report.AppendLine('')
[void]$report.AppendLine('## Übersicht')
[void]$report.AppendLine('')
[void]$report.AppendLine('| Lebensmittel | Schweizer Nährwertdatenbank (ID) | USDA (FDC-ID) | gleich | abweichend | 1 Quelle | übernommen | Status |')
[void]$report.AppendLine('|---|---|---|---|---|---|---|---|')
foreach ($r in $summaryRows) { [void]$report.AppendLine($r) }
[void]$report.AppendLine('')
[void]$report.AppendLine('## Abweichungen im Einzelnen')
[void]$report.AppendLine('')
[void]$report.Append($detail.ToString())
[IO.File]::WriteAllText("$here\PRUEFBERICHT.md", $report.ToString(), $u8)

"Lebensmittel: $($foods.Count) (zwei Quellen: $two, eine: $one, keine: $zero)"
"Einzelwerte: gleich $($stat.ok), abweichend $($stat.diff), eine Quelle $($stat.single), keine $($stat.none)"
"Abweichungen bei Makronährstoffen: $($macroDiff.Count)"
$macroDiff | ForEach-Object { "  $_" }

if (-not $Apply) { return }

# ---- data.js aktualisieren ----
$q = { param($s) "'" + $s.Replace("\", "\\").Replace("'", "\'") + "'" }
$new = New-Object Text.StringBuilder
$meta = New-Object Text.StringBuilder
foreach ($f in $foods) {
  $id = $f.id
  $arr = '[' + (($result[$id] | ForEach-Object { $_.ToString($inv) }) -join ',') + ']'
  if ($old.ContainsKey($id)) {
    $rx = New-Object regex ("(\n\s*\['" + [regex]::Escape($id) + "', [^\n]*?)\[[0-9., ]+\]((?:, true)?\],)")
    if (-not $rx.IsMatch($js)) { throw "Zeile für $id in data.js nicht gefunden" }
    $js = $rx.Replace($js, { param($m) $m.Groups[1].Value + $arr + $m.Groups[2].Value }, 1)
  } else {
    $flags = '[' + ((@($f.flags.Split(',') | Where-Object { $_ }) | ForEach-Object { & $q $_ }) -join ', ') + ']'
    [void]$new.AppendLine("    [$(& $q $id), $(& $q $f.name), '$($f.cat)', '$($f.unit)', $($f.gpu), $($f.price), $flags, $arr],")
  }
  $parts = @()
  $al = @($f.alias.Split(';') | Where-Object { $_ })
  if ($al.Count) { $parts += 'a: [' + (($al | ForEach-Object { & $q $_ }) -join ', ') + ']' }
  foreach ($k in 'tl', 'stk', 'bund', 'dose', 'becher', 'pck') { if ($f[$k]) { $parts += "${k}: $($f[$k])" } }
  if ($parts.Count) { [void]$meta.AppendLine("    $(if ($id -match '^[a-z]+$') { $id } else { & $q $id }): { $($parts -join ', ') },") }
}
$block = "  // >>> generiert von tools/naehrwerte/verify.ps1 (Quellen und Prüfung: tools/naehrwerte/PRUEFBERICHT.md) – nicht von Hand ändern`n" +
  "  ING_RAW.push(`n" + $new.ToString().TrimEnd() + "`n  );`n" +
  "  // Andere Namen (a) und Haushaltsmaße je Lebensmittel: Gramm bzw. ml pro Teelöffel (tl), Stück (stk), Bund, Dose, Becher, Packung (pck)`n" +
  "  KA.ING_META = {`n" + $meta.ToString().TrimEnd() + "`n  };`n" +
  "  // <<< generiert"
if ($rxBlock.IsMatch($js)) { $js = $rxBlock.Replace($js, { param($m) $block }, 1) }
else {
  $anchor = "  KA.ING = {};"
  if (-not $js.Contains($anchor)) { throw 'Einfügestelle in data.js nicht gefunden' }
  $js = $js.Replace($anchor, $block + "`n`n" + $anchor)
}
[IO.File]::WriteAllText("$app\data.js", $js, $u8)
"data.js aktualisiert."
