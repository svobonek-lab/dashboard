[CmdletBinding()]
param(
  [string]$InstallRoot = '/volume1/docker/stavbaflow',
  [string]$ComposeSource = (Join-Path $PSScriptRoot '../compose.yaml'),
  [string]$ConfigSource = (Join-Path $PSScriptRoot '../config.example.json')
)
$ErrorActionPreference = 'Stop'

if ($InstallRoot -notmatch '^/volume[0-9]+/docker/stavbaflow$') { throw 'InstallRoot must be a dedicated Synology /volumeN/docker/stavbaflow directory.' }
if (-not (Test-Path -LiteralPath $ComposeSource) -or -not (Test-Path -LiteralPath $ConfigSource)) { throw 'Connector package is incomplete.' }

foreach ($name in @('config','state','secrets','release')) { New-Item -ItemType Directory -Force -Path (Join-Path $InstallRoot $name) | Out-Null }
Copy-Item -LiteralPath $ComposeSource -Destination (Join-Path $InstallRoot 'compose.yaml') -Force
$configTarget = Join-Path $InstallRoot 'config/config.json'
if (-not (Test-Path -LiteralPath $configTarget)) { Copy-Item -LiteralPath $ConfigSource -Destination $configTarget }

$requiredSecrets = @('source-db-password','enrollment-code')
foreach ($secretName in $requiredSecrets) {
  $secretPath = Join-Path $InstallRoot "secrets/$secretName"
  if (-not (Test-Path -LiteralPath $secretPath) -or (Get-Item -LiteralPath $secretPath).Length -eq 0) { throw "Missing non-empty secret file: $secretPath" }
}

Push-Location $InstallRoot
try {
  & docker compose config --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose validation failed.' }
  & docker compose pull connector
  if ($LASTEXITCODE -ne 0) { throw 'Connector image pull failed.' }
  & docker compose up -d connector
  if ($LASTEXITCODE -ne 0) { throw 'Connector start failed.' }
} finally { Pop-Location }
Write-Host 'StavbaFlow connector started. Complete enrollment in the owner dashboard.'
