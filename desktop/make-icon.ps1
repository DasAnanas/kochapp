# Zeichnet das App-Symbol (weißer Kochtopf mit Dampf auf grünem Grund) und schreibt desktop\kochapp.ico
# mit den Größen 16–256 px. Nur nötig, wenn das Symbol geändert werden soll; build.ps1 bettet die .ico ein.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Entwurf auf einem 256er-Raster, für jede Größe neu gezeichnet (schärfer als Herunterskalieren)
function New-PotBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.ScaleTransform($size / 256, $size / 256)

  $green = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, 139, 87))
  $white = [System.Drawing.Brushes]::White
  $g.FillPath($green, (New-RoundRect 8 8 240 240 56))

  $g.FillPath($white, (New-RoundRect 28 136 40 22 11))     # Griff links
  $g.FillPath($white, (New-RoundRect 188 136 40 22 11))    # Griff rechts
  $g.FillPath($white, (New-RoundRect 58 124 140 88 22))    # Topf
  $g.FillPath($white, (New-RoundRect 46 106 164 24 12))    # Deckelrand
  $g.FillEllipse($white, 114, 84, 28, 28)                  # Deckelknauf

  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 11
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  foreach ($x in 92, 128, 164) {                           # Dampf
    $g.DrawBezier($pen, $x, 70, $x - 14, 56, $x + 14, 46, $x, 30)
  }
  $g.Dispose()
  return $bmp
}

$sizes = 16, 24, 32, 48, 64, 256
$images = foreach ($s in $sizes) {
  $bmp = New-PotBitmap $s
  $ms = New-Object IO.MemoryStream
  if ($s -eq 256) {
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)   # große Stufe als PNG
  } else {
    # kleine Stufen als 32-Bit-DIB (BGRA, Zeilen von unten nach oben) plus leere AND-Maske
    $w = New-Object IO.BinaryWriter($ms)
    $w.Write([int]40); $w.Write([int]$s); $w.Write([int]($s * 2)); $w.Write([int16]1); $w.Write([int16]32)
    $w.Write([int]0); $w.Write([int]0); $w.Write([int]0); $w.Write([int]0); $w.Write([int]0); $w.Write([int]0)
    for ($y = $s - 1; $y -ge 0; $y--) {
      for ($x = 0; $x -lt $s; $x++) { $c = $bmp.GetPixel($x, $y); $w.Write([byte]$c.B); $w.Write([byte]$c.G); $w.Write([byte]$c.R); $w.Write([byte]$c.A) }
    }
    $maskRow = [int]([math]::Ceiling($s / 32)) * 4
    $w.Write((New-Object byte[] ($maskRow * $s)))
    $w.Flush()
  }
  $bmp.Dispose()
  , $ms.ToArray()
}

$out = Join-Path $PSScriptRoot 'kochapp.ico'
$fs = [IO.File]::Create($out)
$w = New-Object IO.BinaryWriter($fs)
$w.Write([int16]0); $w.Write([int16]1); $w.Write([int16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $dim = if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] }
  $w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([int16]1); $w.Write([int16]32); $w.Write([int]$images[$i].Length); $w.Write([int]$offset)
  $offset += $images[$i].Length
}
foreach ($img in $images) { $w.Write($img) }
$w.Close()
Write-Output "Fertig: $out ($((Get-Item $out).Length) Bytes)"
