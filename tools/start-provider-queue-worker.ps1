param(
  [string]$Url = "",
  [string]$LogDir = "",
  [switch]$SkipComfyStart
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $RepoRoot

function Read-DotenvValue {
  param(
    [string]$Path,
    [string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  foreach ($Line in Get-Content -LiteralPath $Path) {
    if ($Line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.+?)\s*$") {
      return $Matches[1].Trim().Trim([char]34).Trim([char]39)
    }
  }

  return ""
}

if ([string]::IsNullOrWhiteSpace($Url)) {
  $Url = Read-DotenvValue -Path (Join-Path $RepoRoot ".env.provider.local") -Name "CUSTOMCARD_PROVIDER_API_BASE_URL"
}

if ([string]::IsNullOrWhiteSpace($Url)) {
  $Url = "https://customcard-three.vercel.app"
}

if ([string]::IsNullOrWhiteSpace($LogDir)) {
  $LogDir = Join-Path $RepoRoot ".codex\logs"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$LogPath = Join-Path $LogDir "provider-queue-worker-$Stamp.log"

function Write-WorkerLog {
  param([string]$Message)
  $Line = "$(Get-Date -Format o) $Message"
  $Line | Out-File -LiteralPath $LogPath -Append -Encoding utf8
}

Write-WorkerLog "Starting CustomCard provider queue worker."
Write-WorkerLog "Repo: $RepoRoot"
Write-WorkerLog "URL: $Url"

try {
  if (-not $SkipComfyStart) {
    Write-WorkerLog "Ensuring local ComfyUI is running."
    & (Join-Path $RepoRoot "tools\start-local-comfyui.ps1") -StartupTimeoutSec 180 *>> $LogPath
  }

  Write-WorkerLog "Starting provider queue loop."
  & (Join-Path $RepoRoot "tools\node.ps1") "scripts/provider-control.mjs" start "--url=$Url" *>> $LogPath
  $ExitCode = $LASTEXITCODE
  Write-WorkerLog "Provider queue loop exited with code $ExitCode."
  exit $ExitCode
} catch {
  Write-WorkerLog "Fatal error: $($_.Exception.Message)"
  throw
}
