# REWE bridge: local HTTP API that fills the rewe.de basket from a shopping list.
# It drives a dedicated Chrome profile via the DevTools protocol; ordering itself is
# never triggered - the user confirms the basket in the browser.
# NOTE: keep this file ASCII-only (Windows PowerShell 5.1 reads BOM-less files as ANSI).
[CmdletBinding()]
param(
  [int]$Port = 8765,
  [int]$DebugPort = 9333,
  [string]$ChromePath,
  [switch]$Visible,           # keep the browser window visible the whole time (default: hidden until the basket is ready)
  [int]$ParentPid             # exit when this process is gone (set by the dAIlykitchen desktop app)
)

$ErrorActionPreference = 'Stop'
$ShopUrl = 'https://www.rewe.de/shop/'
$BasketUrl = 'https://www.rewe.de/shop/checkout/basket'
$DataDir = Join-Path $PSScriptRoot '.data'
$ProfileDir = Join-Path $DataDir 'chrome-profile'
$TokenFile = Join-Path $DataDir 'token.txt'
$LogFile = Join-Path $DataDir 'bridge.log'
$MapFile = Join-Path $PSScriptRoot 'mappings.json'
$PageScript = Get-Content (Join-Path $PSScriptRoot 'rewe-page.js') -Raw -Encoding UTF8
$None = [Threading.CancellationToken]::None

$script:Ws = $null; $script:CdpId = 0; $script:RxTask = $null
$script:RxBuf = New-Object byte[] 65536
$script:RxSeg = New-Object 'System.ArraySegment[byte]' -ArgumentList @(, $script:RxBuf)
$script:RxStream = New-Object IO.MemoryStream
$script:CtxTask = $null
$script:Jobs = [ordered]@{}
$script:Queue = New-Object Collections.Queue
$script:Busy = $false
$script:Shop = $null

# Console output plus a log file - the desktop app runs the bridge without a console window.
function Log($msg, [switch]$ConsoleOnly) {
  $line = '[{0:HH:mm:ss}] {1}' -f (Get-Date), $msg
  Write-Host $line
  if (-not $ConsoleOnly) { try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch { } }
}

# ---------- token ----------

New-Item -ItemType Directory -Force $ProfileDir | Out-Null
if ((Test-Path $LogFile) -and (Get-Item $LogFile).Length -gt 1MB) { Clear-Content $LogFile }
if (-not (Test-Path $TokenFile)) {
  $bytes = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Set-Content $TokenFile (-join ($bytes | ForEach-Object { $_.ToString('x2') })) -Encoding ascii
}
$Token = (Get-Content $TokenFile -Raw).Trim()

# ---------- browser / DevTools protocol ----------

function Find-Chrome {
  if ($ChromePath) { return $ChromePath }
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
  throw 'Chrome/Edge not found - pass -ChromePath.'
}

function Get-Targets {
  try { return @(Invoke-RestMethod "http://127.0.0.1:$DebugPort/json/list" -TimeoutSec 2) } catch { return $null }
}

function Reset-Cdp {
  if ($script:Ws) { try { $script:Ws.Dispose() } catch { } }
  $script:Ws = $null; $script:RxTask = $null
  $script:RxStream.SetLength(0)
}

function Receive-Cdp([int]$ms) {
  if (-not $script:RxTask) { $script:RxTask = $script:Ws.ReceiveAsync($script:RxSeg, $None) }
  if (-not $script:RxTask.Wait($ms)) { return $null }
  $r = $script:RxTask.Result
  $script:RxTask = $null
  if ($r.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close) { throw 'Browser closed the DevTools connection.' }
  $script:RxStream.Write($script:RxBuf, 0, $r.Count)
  if (-not $r.EndOfMessage) { return $null }
  $text = [Text.Encoding]::UTF8.GetString($script:RxStream.ToArray())
  $script:RxStream.SetLength(0)
  return ($text | ConvertFrom-Json)
}

function Invoke-Cdp([string]$method, $params = @{}, [int]$timeoutMs = 30000) {
  $id = ++$script:CdpId
  $json = ConvertTo-Json -InputObject @{ id = $id; method = $method; params = $params } -Depth 10 -Compress
  $seg = New-Object 'System.ArraySegment[byte]' -ArgumentList @(, [Text.Encoding]::UTF8.GetBytes($json))
  [void]$script:Ws.SendAsync($seg, [Net.WebSockets.WebSocketMessageType]::Text, $true, $None).GetAwaiter().GetResult()
  $deadline = (Get-Date).AddMilliseconds($timeoutMs)
  while ((Get-Date) -lt $deadline) {
    $msg = Receive-Cdp 100
    if ($msg -and $msg.id -eq $id) {
      if ($msg.error) { throw "DevTools error in ${method}: $($msg.error.message)" }
      return $msg.result
    }
    Pump-Http
  }
  throw "DevTools timeout in $method"
}

function Invoke-PageJs([string]$expression, [int]$timeoutMs = 30000) {
  $res = Invoke-Cdp 'Runtime.evaluate' @{ expression = $expression; awaitPromise = $true; returnByValue = $true } $timeoutMs
  if ($res.exceptionDetails) {
    $d = $res.exceptionDetails
    $text = if ($d.exception -and $d.exception.description) { $d.exception.description } else { $d.text }
    throw "Page script failed: $text"
  }
  return $res.result.value
}

function Wait-Pump([int]$ms) {
  $deadline = (Get-Date).AddMilliseconds($ms)
  while ((Get-Date) -lt $deadline) { Pump-Http; Start-Sleep -Milliseconds 40 }
}

# Starts the dedicated Chrome if needed and attaches to its rewe.de tab.
function Connect-Browser {
  if ($script:Ws -and $script:Ws.State -eq [Net.WebSockets.WebSocketState]::Open) {
    try { [void](Invoke-Cdp 'Runtime.evaluate' @{ expression = '1' } 3000); return } catch { }
  }
  Reset-Cdp
  $targets = Get-Targets
  if ($null -eq $targets) {
    Log 'Starting browser ...'
    $chromeArgs = @("--remote-debugging-port=$DebugPort", "--user-data-dir=`"$ProfileDir`"", '--no-first-run', '--no-default-browser-check',
      '--hide-crash-restore-bubble', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding')
    if ($Visible) { Start-Process (Find-Chrome) -ArgumentList ($chromeArgs + $ShopUrl) }
    else {
      # Hidden until the basket is ready: start minimized and off-screen, Show-Window brings it back.
      Start-Process (Find-Chrome) -ArgumentList ($chromeArgs + '--window-position=-32000,-32000' + $ShopUrl) -WindowStyle Minimized
      $script:HideOnConnect = $true
    }
    for ($i = 0; $i -lt 60 -and $null -eq $targets; $i++) { Wait-Pump 500; $targets = Get-Targets }
    if ($null -eq $targets) { throw "Browser did not open DevTools port $DebugPort." }
  }
  $pages = @($targets | Where-Object { $_.type -eq 'page' })
  $page = $pages | Where-Object { $_.url -like '*rewe.de*' } | Select-Object -First 1
  if (-not $page) { $page = $pages | Select-Object -First 1 }
  if (-not $page) { $page = Invoke-RestMethod "http://127.0.0.1:$DebugPort/json/new?about:blank" -Method Put -TimeoutSec 5 }
  $script:Ws = New-Object Net.WebSockets.ClientWebSocket
  [void]$script:Ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $None).GetAwaiter().GetResult()
  if ($script:HideOnConnect) { $script:HideOnConnect = $false; Set-Window 'minimized' }
}

function Open-Url([string]$url) {
  try { [void](Invoke-PageJs 'window.__reweOld = 1') } catch { }
  [void](Invoke-Cdp 'Page.navigate' @{ url = $url })
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    Wait-Pump 250
    try { if ((Invoke-PageJs "document.readyState === 'complete' && !window.__reweOld" 5000) -eq $true) { return } } catch { }
  }
  throw "Page did not finish loading: $url"
}

function Set-Window([string]$state) {
  try {
    $w = Invoke-Cdp 'Browser.getWindowForTarget' @{} 5000
    [void](Invoke-Cdp 'Browser.setWindowBounds' @{ windowId = $w.windowId; bounds = @{ windowState = $state } } 5000)
    if ($state -eq 'normal') {
      # The window may have been started off-screen: move it onto the screen before showing it.
      [void](Invoke-Cdp 'Browser.setWindowBounds' @{ windowId = $w.windowId; bounds = @{ left = 60; top = 40; width = 1280; height = 900 } } 5000)
      [void](Invoke-Cdp 'Page.bringToFront' @{} 5000)
    }
  } catch { Log "Window state '$state' failed: $($_.Exception.Message)" }
}

# Loads the shop start page, injects the page script and returns { marketCode, zipCode, loggedIn, ... }.
function Open-Shop {
  Connect-Browser
  Open-Url $ShopUrl
  [void](Invoke-PageJs $PageScript)
  $script:Shop = Invoke-PageJs '__reweBridge.status()'
  return $script:Shop
}

function Show-Basket {
  Connect-Browser
  Open-Url $BasketUrl
  Set-Window 'normal'
}

# ---------- orders ----------

function Get-Mapping($map, $item) {
  if (-not $map) { return $null }
  foreach ($key in @($item.sku, $item.name)) {
    if ($key) { $p = $map.PSObject.Properties[[string]$key]; if ($p) { return $p.Value } }
  }
  return $null
}

function Invoke-Order($job) {
  $job.status = 'running'
  try {
    $shop = Open-Shop
    if ($shop.challenge) {
      Set-Window 'normal'
      $job.status = 'needs_attention'; $job.message = 'rewe.de zeigt eine Sicherheitspruefung. Bitte im Browserfenster bestaetigen und erneut senden.'
      return
    }
    if (-not $shop.marketCode) {
      Set-Window 'normal'
      $job.status = 'needs_setup'; $job.message = 'Kein Markt gewaehlt. Bitte im Browserfenster PLZ und Liefer-/Abholservice waehlen (und anmelden), dann erneut senden.'
      return
    }
    if (-not $Visible -and $job.options.background -ne $false) { Set-Window 'minimized' }

    $map = $null
    if (Test-Path $MapFile) { $map = Get-Content $MapFile -Raw -Encoding UTF8 | ConvertFrom-Json }
    $opts = ConvertTo-Json -InputObject @{ mode = $(if ($job.options.mode -eq 'add') { 'add' } else { 'set' }) } -Compress

    foreach ($src in $job.items) {
      $item = [ordered]@{ sku = $src.sku; name = $src.name; quantity = $src.quantity; unit = $src.unit; gramsPerUnit = $src.gramsPerUnit
        search = $src.search; productId = $src.productId; packages = $src.packages }
      $m = Get-Mapping $map $src
      # mappings.json is the user's explicit choice: it wins over the search term derived by the app
      if ($m) { foreach ($k in 'search', 'productId', 'packages') { if ($m.$k -and ($k -ne 'packages' -or -not $item[$k])) { $item[$k] = $m.$k } } }
      $r = Invoke-PageJs ("__reweBridge.fillItem({0},{1})" -f (ConvertTo-Json -InputObject $item -Compress), $opts) 60000
      [void]$job.results.Add($r)
      $job.progress.done++
      if ($r.ok) { Log ("  + {0}x {1}  <- {2}" -f $r.packages, $r.product.name, $r.name) } else { Log ("  ! {0}: {1}" -f $r.name, $r.error) }
      Wait-Pump (Get-Random -Minimum 250 -Maximum 700)
    }

    $ok = @($job.results | Where-Object { $_.ok })
    $total = 0; foreach ($r in $ok) { if ($null -ne $r.product.price) { $total += $r.product.price * $r.packages } }
    $job.summary = @{ added = $ok.Count; failed = $job.results.Count - $ok.Count; estimatedTotal = [Math]::Round($total, 2) }
    if ($job.options.openCheckout -ne $false) { Show-Basket } else { Open-Url $BasketUrl }
    $job.status = 'done'
    $job.message = "$($ok.Count) von $($job.results.Count) Artikeln im REWE-Warenkorb"
  } catch {
    $job.status = 'failed'; $job.message = $_.Exception.Message
    Log "Order $($job.orderId) failed: $($job.message)"
    Reset-Cdp
  }
}

# ---------- HTTP API ----------

function Send-Json($ctx, [int]$code, $obj) {
  $res = $ctx.Response
  $origin = $ctx.Request.Headers['Origin']
  if ($origin) { $res.Headers['Access-Control-Allow-Origin'] = $origin; $res.Headers['Vary'] = 'Origin' }
  $res.Headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
  $res.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $res.Headers['Access-Control-Allow-Private-Network'] = 'true'
  $res.Headers['Access-Control-Max-Age'] = '600'
  $res.StatusCode = $code
  if ($null -ne $obj) {
    $bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $obj -Depth 10 -Compress))
    $res.ContentType = 'application/json; charset=utf-8'
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  }
  $res.Close()
}

function Get-JobView($job) {
  return [ordered]@{ orderId = $job.orderId; status = $job.status; message = $job.message; progress = $job.progress
    summary = $job.summary; results = $job.results; checkoutUrl = $BasketUrl; createdAt = $job.createdAt }
}

# Handlers only touch state; browser work happens in the main loop (they may run while a job is waiting).
function Handle-Request($ctx) {
  $req = $ctx.Request
  $path = $req.Url.AbsolutePath.TrimEnd('/')
  if ($req.HttpMethod -eq 'OPTIONS') { return Send-Json $ctx 204 $null }
  if ($req.HttpMethod -eq 'GET' -and $path -eq '/health') { return Send-Json $ctx 200 @{ ok = $true; service = 'rewe-bridge' } }
  if ($req.Headers['Authorization'] -cne "Bearer $Token") { return Send-Json $ctx 401 @{ error = 'Missing or wrong API key (Authorization: Bearer <token>).' } }

  if ($req.HttpMethod -eq 'GET' -and $path -eq '/status') {
    return Send-Json $ctx 200 @{ busy = $script:Busy; queued = $script:Queue.Count; shop = $script:Shop; ready = [bool]($script:Shop -and $script:Shop.marketCode) }
  }
  if ($req.HttpMethod -eq 'POST' -and $path -eq '/orders') {
    if ($req.ContentLength64 -gt 1MB) { return Send-Json $ctx 413 @{ error = 'Body too large.' } }
    $order = $null
    try { $order = (New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8)).ReadToEnd() | ConvertFrom-Json } catch { }
    $items = @(); if ($order) { $items = @($order.items | Where-Object { $_ -and ([string]$_.name).Trim() }) }
    if (-not $items.Count -or $items.Count -gt 200) { return Send-Json $ctx 400 @{ error = 'Expected { items: [{ name, quantity, unit }] } with 1-200 items.' } }
    $id = 'REWE-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + (Get-Random -Maximum 999)
    $job = @{ type = 'order'; orderId = $id; status = 'queued'; message = ''; createdAt = (Get-Date).ToString('o'); items = $items
      options = $(if ($order.options) { $order.options } else { [pscustomobject]@{} })
      progress = @{ done = 0; total = $items.Count }; results = (New-Object Collections.ArrayList); summary = $null }
    $script:Jobs[$id] = $job
    while ($script:Jobs.Count -gt 20) { $script:Jobs.RemoveAt(0) }
    $script:Queue.Enqueue($job)
    Log "Order $id queued ($($items.Count) items)"
    return Send-Json $ctx 202 @{ orderId = $id; status = 'queued'; statusUrl = "/orders/$id" }
  }
  if ($req.HttpMethod -eq 'GET' -and $path -like '/orders/*') {
    $job = $script:Jobs[$path.Substring(8)]
    if (-not $job) { return Send-Json $ctx 404 @{ error = 'Unknown order.' } }
    return Send-Json $ctx 200 (Get-JobView $job)
  }
  if ($req.HttpMethod -eq 'POST' -and $path -eq '/market') {
    $m = $null
    try { $m = (New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8)).ReadToEnd() | ConvertFrom-Json } catch { }
    if (-not $m -or ([string]$m.zipCode) -notmatch '^\d{5}$') { return Send-Json $ctx 400 @{ error = 'Expected { zipCode: "12345", service: "DELIVERY" | "PICKUP" }.' } }
    $script:Queue.Enqueue(@{ type = 'market'; zipCode = [string]$m.zipCode; service = [string]$m.service; wwIdent = [string]$m.wwIdent })
    return Send-Json $ctx 202 @{ status = 'queued'; statusUrl = '/status' }
  }
  if ($req.HttpMethod -eq 'POST' -and $path -eq '/basket/open') {
    $script:Queue.Enqueue(@{ type = 'show' })
    return Send-Json $ctx 202 @{ status = 'queued'; checkoutUrl = $BasketUrl }
  }
  Send-Json $ctx 404 @{ error = 'Not found.' }
}

function Pump-Http {
  if (-not $script:Listener) { return }
  if (-not $script:CtxTask) { $script:CtxTask = $script:Listener.GetContextAsync() }
  while ($script:CtxTask.Wait(0)) {
    $ctx = $script:CtxTask.Result
    $script:CtxTask = $script:Listener.GetContextAsync()
    try { Handle-Request $ctx } catch {
      Log "Request failed: $($_.Exception.Message)"
      try { Send-Json $ctx 500 @{ error = 'Internal error.' } } catch { }
    }
  }
}

# ---------- main ----------

$script:Listener = New-Object Net.HttpListener
$script:Listener.Prefixes.Add("http://localhost:$Port/")
$script:Listener.Start()

Log "REWE bridge listening on http://localhost:$Port"
Log "API key: $Token" -ConsoleOnly
try {
  try {
    $shop = Open-Shop
    if ($shop.marketCode) { Log ("Ready - market {0} (PLZ {1}), logged in: {2}" -f $shop.marketCode, $shop.zipCode, $shop.loggedIn) }
    else { Log 'No market chosen yet - it is set from the PLZ sent by the app (POST /market).' }
    if (-not $Visible) { Set-Window 'minimized' }
  } catch { Log "Browser not ready yet: $($_.Exception.Message)"; Reset-Cdp }

  $nextParentCheck = Get-Date
  while ($true) {
    if ($ParentPid -and (Get-Date) -gt $nextParentCheck) {
      if (-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { Log 'dAIlykitchen was closed - stopping the bridge (the browser window stays open).'; break }
      $nextParentCheck = (Get-Date).AddSeconds(2)
    }
    Pump-Http
    if ($script:Queue.Count) {
      $cmd = $script:Queue.Dequeue()
      $script:Busy = $true
      try {
        if ($cmd.type -eq 'order') { Invoke-Order $cmd; Log "Order $($cmd.orderId): $($cmd.status) $($cmd.message)" }
        elseif ($cmd.type -eq 'market') {
          [void](Open-Shop)
          $sel = ConvertTo-Json -InputObject @($cmd.zipCode, $cmd.service, $cmd.wwIdent) -Compress
          [void](Invoke-PageJs "__reweBridge.selectMarket(...$sel)")
          $shop = Open-Shop
          Log ("Market set: {0} (PLZ {1}, {2})" -f $shop.marketCode, $shop.zipCode, ($shop.serviceTypes -join ','))
        }
        else { Show-Basket }
      } catch { Log "Command failed: $($_.Exception.Message)"; Reset-Cdp }
      $script:Busy = $false
    } else { Start-Sleep -Milliseconds 50 }
  }
} finally {
  $script:Listener.Stop()
  Reset-Cdp
}
