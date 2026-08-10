param(
  [string]$Url = "",
  [string]$LogDir = "",
  [int]$ComfyStartupTimeoutSec = 600,
  [int]$RetryDelaySec = 30,
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

while ($true) {
  # rig manual gate: owner paused automated GPU jobs (dashboard/widget/CLI).
  # Missing/unreadable file == not paused. Only prevents (re)starting the
  # ComfyUI + queue loop; an already-running node loop is not interrupted.
  $GatePaused = $false
  try { $GatePaused = [bool]((Get-Content -LiteralPath 'D:\rig\state\manual-gate.json' -Raw -ErrorAction Stop | ConvertFrom-Json).paused) } catch { }
  if ($GatePaused) {
    Write-WorkerLog "rig manual gate is paused; holding queue worker for $RetryDelaySec seconds."
    Start-Sleep -Seconds $RetryDelaySec
    continue
  }

  try {
    if (-not $SkipComfyStart) {
      Write-WorkerLog "Ensuring local ComfyUI is running."
      & (Join-Path $RepoRoot "tools\start-local-comfyui.ps1") -StartupTimeoutSec $ComfyStartupTimeoutSec *>> $LogPath
    }

    Write-WorkerLog "Starting provider queue loop."
    & (Join-Path $RepoRoot "tools\node.ps1") "scripts/provider-control.mjs" start "--url=$Url" *>> $LogPath
    $ExitCode = $LASTEXITCODE
    Write-WorkerLog "Provider queue loop exited with code $ExitCode. Restarting in $RetryDelaySec seconds."
  } catch {
    Write-WorkerLog "Worker supervisor iteration failed: $($_.Exception.Message). Restarting in $RetryDelaySec seconds."
  }

  Start-Sleep -Seconds $RetryDelaySec
}
