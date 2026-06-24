param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('run', 'stop', 'status', 'setup')]
    [string]$Action
)

# ----- CONFIG (edit here if needed) -------------------------
$ChromePath    = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$HostBridgeDir = Split-Path -Parent $PSScriptRoot
$Token         = 'change-me'
$BridgeHost    = '127.0.0.1'
$BridgePort    = 8765
$CdpAddress    = '127.0.0.1'
$CdpPort       = 9222
$CdpUrl        = "http://127.0.0.1:$CdpPort"
$UserDataDir   = Join-Path $env:TEMP 'gpt-relay-chrome'
# ------------------------------------------------------------

$ErrorActionPreference = 'Continue'

function Write-Step($msg) { Write-Host ("[ .. ] " + $msg) -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host ("[ OK ] " + $msg) -ForegroundColor Green }
function Write-Fail($msg) { Write-Host ("[FAIL] " + $msg) -ForegroundColor Red }
function Write-Warn($msg) { Write-Host ("[WARN] " + $msg) -ForegroundColor Yellow }

function Test-PortListening($port) {
    try { return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop) }
    catch { return $false }
}

function Invoke-Check($url, $headers, $timeoutSec) {
    if (-not $headers) { $headers = @{} }
    if (-not $timeoutSec) { $timeoutSec = 5 }
    try {
        $resp = Invoke-WebRequest -Uri $url -Headers $headers -TimeoutSec $timeoutSec -UseBasicParsing -ErrorAction Stop
        return [pscustomobject]@{ Ok = $true; Body = $resp.Content }
    } catch { return [pscustomobject]@{ Ok = $false; Body = $null } }
}

function Wait-For($check, $timeoutSec, $label) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    Write-Host ("[ .. ] waiting for " + $label + " ") -ForegroundColor Cyan -NoNewline
    while ((Get-Date) -lt $deadline) {
        if (& $check) { Write-Host ''; return $true }
        Write-Host '.' -NoNewline
        Start-Sleep -Seconds 1
    }
    Write-Host ''
    return $false
}

function Get-DebugChromeProcs {
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and ($_.CommandLine -match 'gpt-relay-chrome' -or $_.CommandLine -match "remote-debugging-port=$CdpPort") }
}

function Get-BridgeRelatedPids {
    $found = @()
    try { $found += Get-NetTCPConnection -LocalPort $BridgePort -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess } catch {}
    $found += Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { ($_.Name -eq 'node.exe' -or $_.Name -eq 'cmd.exe') -and $_.CommandLine -match 'server\.mjs' } |
        Select-Object -ExpandProperty ProcessId
    return ($found | Where-Object { $_ } | Sort-Object -Unique)
}

function Get-StatusReport {
    $chromeProcs = @(Get-DebugChromeProcs)
    $ver = Invoke-Check "$CdpUrl/json/version" $null 4
    $health = Invoke-Check "http://127.0.0.1:$BridgePort/health" @{ Authorization = "Bearer $Token" } 8
    $browserVer = $null
    if ($ver.Ok -and $ver.Body) { try { $browserVer = ($ver.Body | ConvertFrom-Json).Browser } catch {} }
    return [pscustomobject]@{ ChromeDebug = ($chromeProcs.Count -gt 0); Port9222 = (Test-PortListening $CdpPort); Port8765 = (Test-PortListening $BridgePort); JsonVersion = $ver.Ok; BrowserVer = $browserVer; Health = $health.Ok }
}

function Show-Status($r) {
    Write-Host '----- status -----'
    if ($r.ChromeDebug) { Write-Ok "chrome.exe with remote-debugging-port=$CdpPort : present" } else { Write-Fail "chrome.exe with remote-debugging-port=$CdpPort : not found" }
    if ($r.Port9222) { Write-Ok "port $CdpPort LISTENING" } else { Write-Fail "port $CdpPort NOT listening" }
    if ($r.Port8765) { Write-Ok "port $BridgePort LISTENING" } else { Write-Fail "port $BridgePort NOT listening" }
    if ($r.JsonVersion) { $extra = if ($r.BrowserVer) { " (" + $r.BrowserVer + ")" } else { '' }; Write-Ok ("GET /json/version OK" + $extra) } else { Write-Fail 'GET /json/version failed' }
    if ($r.Health) { Write-Ok 'GET /health OK (token accepted)' } else { Write-Fail 'GET /health failed' }
    Write-Host '------------------'
}

function Do-Setup {
    Write-Host '=== GPT Relay Host : SETUP (npm install) ==='
    if (-not (Test-Path $HostBridgeDir)) { Write-Fail "host-bridge dir not found: $HostBridgeDir"; return $false }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Fail 'npm not found on PATH. Install Node.js first.'; return $false }
    Push-Location $HostBridgeDir
    try { Write-Step "Running npm install in $HostBridgeDir ..."; & npm install; $code = $LASTEXITCODE } finally { Pop-Location }
    if ($code -eq 0) { Write-Ok 'npm install completed.'; return $true }
    Write-Fail "npm install failed (exit $code). (step: npm)"; return $false
}

function Do-Run {
    Write-Host '=== GPT Relay Host : RUN ==='; Write-Host ''
    Write-Step 'Closing all chrome.exe (this also closes your normal Chrome) ...'
    Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1; Write-Ok 'Chrome processes closed.'
    if (-not (Test-Path $ChromePath)) { Write-Fail "Chrome not found at: $ChromePath (step: Chrome)"; return $false }
    Write-Step 'Launching Chrome with remote debugging ...'
    Start-Process -FilePath $ChromePath -ArgumentList @("--remote-debugging-address=$CdpAddress", "--remote-debugging-port=$CdpPort", "--user-data-dir=$UserDataDir") | Out-Null
    if (-not (Wait-For { (Invoke-Check "$CdpUrl/json/version" $null 3).Ok } 30 "Chrome CDP on port $CdpPort")) { Write-Fail "Chrome / port $CdpPort not reachable in time. (step: Chrome / 9222)"; return $false }
    Write-Ok "Chrome remote debugging is up on port $CdpPort."
    if (-not (Test-Path (Join-Path $HostBridgeDir 'node_modules'))) { Write-Warn 'node_modules missing -> running npm install ...'; if (-not (Do-Setup)) { return $false } } else { Write-Ok 'host-bridge dependencies present.' }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Fail 'node not found on PATH. Install Node.js first. (step: node)'; return $false }
    if (Test-PortListening $BridgePort) { Write-Warn "Port $BridgePort already LISTENING -> skipping launch." } else {
        Write-Step 'Starting host-bridge (node server.mjs) in a new window ...'
        $env:HOST_BRIDGE_TOKEN = $Token; $env:HOST_BRIDGE_HOST = $BridgeHost; $env:HOST_BRIDGE_PORT = "$BridgePort"; $env:CHROME_CDP_URL = $CdpUrl
        Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'node server.mjs' -WorkingDirectory $HostBridgeDir | Out-Null
    }
    $okHealth = Wait-For { (Invoke-Check "http://127.0.0.1:$BridgePort/health" @{ Authorization = "Bearer $Token" } 5).Ok } 45 'host-bridge /health'
    if ($okHealth) { Write-Ok 'host-bridge /health passed.' } else { Write-Fail 'host-bridge /health did not pass. (step: /health) -- check the host-bridge cmd window log.' }
    $r = Get-StatusReport; Show-Status $r
    if ($r.Port9222 -and $r.JsonVersion -and $r.Port8765 -and $r.Health) { Write-Host '==== SUCCESS : GPT Relay host is ready. ====' -ForegroundColor Green; return $true }
    Write-Host '==== FAILED : see the [FAIL] lines above. ====' -ForegroundColor Red; return $false
}

function Do-Stop {
    Write-Host '=== GPT Relay Host : STOP ==='; Write-Host ''
    $bridgePids = @(Get-BridgeRelatedPids)
    if ($bridgePids.Count -gt 0) { Write-Step ('Stopping host-bridge process(es): ' + ($bridgePids -join ', ')); foreach ($procId in $bridgePids) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }; Write-Ok 'host-bridge stopped.' } else { Write-Warn "No host-bridge process found (port $BridgePort / server.mjs)." }
    $chromeProcs = @(Get-DebugChromeProcs)
    if ($chromeProcs.Count -gt 0) { Write-Step ('Closing gpt-relay debug Chrome (' + $chromeProcs.Count + ' process(es)) ...'); foreach ($p in $chromeProcs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }; Write-Ok 'Debug Chrome closed (your personal Chrome was left untouched).' } else { Write-Warn 'No gpt-relay debug Chrome found.' }
    Write-Host '==== Stop complete. ====' -ForegroundColor Green
}

function Do-StatusAction { Write-Host '=== GPT Relay Host : STATUS ==='; $r = Get-StatusReport; Show-Status $r }

switch ($Action) {
    'run' { if (-not (Do-Run)) { exit 1 } }
    'stop' { Do-Stop }
    'status' { Do-StatusAction }
    'setup' { if (-not (Do-Setup)) { exit 1 } }
}
