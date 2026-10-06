[CmdletBinding()]
param(
  [string]$InstallRoot = '/volume1/docker/stavbaflow',
  [string]$ManifestUrl = 'https://github.com/svobonek-lab/dashboard/releases/latest/download/connector-manifest.json',
  [string]$PinnedDigest = '',
  [switch]$DisableAutoUpdate,
  [int]$HealthTimeoutSeconds = 120
)
$ErrorActionPreference = 'Stop'
$DigestPattern = '^sha256:[a-f0-9]{64}$'

function Resolve-ConnectorUpdateDecision {
  param([object]$Manifest, [string]$CurrentDigest, [string]$Pin, [bool]$AutoUpdate)
  if (-not $AutoUpdate -and -not $Pin) { return [pscustomobject]@{ Action='disabled'; Digest=$CurrentDigest } }
  $target = if ($Pin) { $Pin } else { [string]$Manifest.digest }
  if ($target -notmatch $script:DigestPattern) { throw 'Release digest is invalid.' }
  if ($CurrentDigest -eq $target) { return [pscustomobject]@{ Action='noop'; Digest=$target } }
  return [pscustomobject]@{ Action='update'; Digest=$target }
}

function Test-ConnectorHealth {
  param([int]$TimeoutSeconds)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $health = & docker compose exec -T connector node -e "fetch('http://127.0.0.1:8787/health').then(async r=>{const h=await r.json();if(!r.ok||!h.lastHeartbeatAt)process.exit(1);console.log(JSON.stringify(h))}).catch(()=>process.exit(1))" 2>$null
    if ($LASTEXITCODE -eq 0 -and $health) { return $true }
    Start-Sleep -Seconds 3
  } while ((Get-Date) -lt $deadline)
  return $false
}

if ($env:STAVBAFLOW_UPDATER_LIBRARY_ONLY -eq '1') { return }
if ($InstallRoot -notmatch '^/volume[0-9]+/docker/stavbaflow$') { throw 'InstallRoot is outside the dedicated connector directory.' }
if ($HealthTimeoutSeconds -lt 15 -or $HealthTimeoutSeconds -gt 600) { throw 'Health timeout is outside the safe range.' }
$releaseDir = Join-Path $InstallRoot 'release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$statePath = Join-Path $releaseDir 'image-state.json'
$state = if (Test-Path -LiteralPath $statePath) { Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json } else { [pscustomobject]@{ currentDigest=''; previousDigest='' } }
$manifest = if ($PinnedDigest) { [pscustomobject]@{ image='ghcr.io/svobonek-lab/stavbaflow-connector'; digest=$PinnedDigest } } else { Invoke-RestMethod -Uri $ManifestUrl -Method Get -TimeoutSec 20 }
if ([string]$manifest.image -ne 'ghcr.io/svobonek-lab/stavbaflow-connector') { throw 'Release image is not trusted.' }
$decision = Resolve-ConnectorUpdateDecision $manifest ([string]$state.currentDigest) $PinnedDigest (-not $DisableAutoUpdate)
if ($decision.Action -ne 'update') { Write-Host "Connector update: $($decision.Action)."; exit 0 }

$priorDigest = [string]$state.currentDigest
$targetImage = "$($manifest.image)@$($decision.Digest)"
Push-Location $InstallRoot
try {
  $env:STAVBAFLOW_CONNECTOR_IMAGE = $targetImage
  & docker compose pull connector
  if ($LASTEXITCODE -ne 0) { throw 'Registry pull failed.' }
  & docker compose up -d --no-deps connector
  if ($LASTEXITCODE -ne 0 -or -not (Test-ConnectorHealth $HealthTimeoutSeconds)) { throw 'Updated connector did not produce a healthy signed heartbeat.' }
  $next = [pscustomobject]@{ currentDigest=$decision.Digest; previousDigest=$priorDigest; updatedAt=(Get-Date).ToUniversalTime().ToString('o') }
  $temporary = "$statePath.tmp"
  $next | ConvertTo-Json | Set-Content -LiteralPath $temporary -Encoding utf8
  Move-Item -LiteralPath $temporary -Destination $statePath -Force
} catch {
  if ($priorDigest -match $DigestPattern) {
    $env:STAVBAFLOW_CONNECTOR_IMAGE = "$($manifest.image)@$priorDigest"
    & docker compose up -d --no-deps connector | Out-Null
  }
  throw
} finally {
  Remove-Item Env:STAVBAFLOW_CONNECTOR_IMAGE -ErrorAction SilentlyContinue
  Pop-Location
}
Write-Host 'Connector update completed and the platform heartbeat was verified.'
