param(
  [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ToolsDir = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot "tools"))

function Split-PathList([string]$PathValue) {
  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return @()
  }
  return $PathValue -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

function Add-PathEntry([string]$Target, [string]$Scope) {
  $current = [Environment]::GetEnvironmentVariable("Path", $Scope)
  $entries = @(Split-PathList $current)
  $exists = $entries | Where-Object { $_.TrimEnd("\") -ieq $Target.TrimEnd("\") }
  if (-not $exists) {
    $entries += $Target
    [Environment]::SetEnvironmentVariable("Path", ($entries -join ";"), $Scope)
    return $true
  }
  return $false
}

if (-not (Test-Path -LiteralPath (Join-Path $ToolsDir "npm.cmd"))) {
  throw "CustomCard npm shim is missing: $ToolsDir\npm.cmd"
}

$userPathUpdated = Add-PathEntry $ToolsDir "User"
$processPathUpdated = $false
$processEntries = @(Split-PathList $env:Path)
$processExists = $processEntries | Where-Object { $_.TrimEnd("\") -ieq $ToolsDir.TrimEnd("\") }
if (-not $processExists) {
  $env:Path = (($processEntries + $ToolsDir) -join ";")
  $processPathUpdated = $true
}

$nodeVersion = $null
$npmVersion = $null
if (-not $SkipVerify) {
  $nodeVersion = (& (Join-Path $ToolsDir "node.cmd") --version).Trim()
  $npmVersion = (& (Join-Path $ToolsDir "npm.cmd") --version).Trim()
}

[pscustomobject]@{
  service = "customcard-npm-path-fix"
  status = "ready"
  toolsDir = $ToolsDir
  userPathUpdated = $userPathUpdated
  processPathUpdated = $processPathUpdated
  nodeVersion = $nodeVersion
  npmVersion = $npmVersion
} | ConvertTo-Json -Compress
