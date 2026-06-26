param(
  [string]$Command = "status",
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ProviderArgs
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$toolsDir = Join-Path $repoRoot "tools"
if (Test-Path -LiteralPath $toolsDir) {
  $env:Path = "$toolsDir;$env:Path"
}

function Find-CommandPath {
  param([string]$Name)
  $candidate = Get-Command $Name -ErrorAction SilentlyContinue
  if ($candidate) {
    return $candidate.Source
  }
  return $null
}

$npm = Find-CommandPath "npm"
$node = Find-CommandPath "node"

if ($npm) {
  Push-Location $repoRoot
  try {
    & $npm run "provider:$Command" -- @ProviderArgs
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
}

if ($node) {
  Push-Location $repoRoot
  try {
    & $node "scripts/provider-control.mjs" $Command @ProviderArgs
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
}

Write-Host "customcard-provider-control: blocked"
Write-Host "blocker: Node.js >= 24 is not on PATH, so the provider worker cannot run from this shell."
Write-Host "next: install Node.js or add node/npm to PATH, then run scripts/provider.ps1 setup"
exit 1
