param(
  [string]$Url = "",
  [string]$ComfyUrl = "",
  [int]$Port = 8794,
  [string]$HostName = "127.0.0.1",
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $RepoRoot

$ArgsList = @(
  "scripts/provider-dashboard.mjs",
  "--host=$HostName",
  "--port=$Port"
)

if (-not [string]::IsNullOrWhiteSpace($Url)) {
  $ArgsList += "--url=$Url"
}

if (-not [string]::IsNullOrWhiteSpace($ComfyUrl)) {
  $ArgsList += "--comfy-url=$ComfyUrl"
}

if ($NoBrowser) {
  $ArgsList += "--no-open"
}

& (Join-Path $RepoRoot "tools\node.ps1") @ArgsList
