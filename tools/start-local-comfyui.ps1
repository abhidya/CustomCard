param(
  [string]$ComfyRoot = $env:CUSTOMCARD_COMFYUI_ROOT,
  [string]$PythonPath = "",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8188,
  [int]$StartupTimeoutSec = 120
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-UsablePath {
  param([string]$Path)
  return -not [string]::IsNullOrWhiteSpace($Path) -and (Test-Path -LiteralPath $Path)
}

if (-not (Test-UsablePath $ComfyRoot)) {
  $Candidates = @(
    "D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI",
    (Join-Path $RepoRoot ".codex\comfyui\ComfyUI"),
    (Join-Path $RepoRoot "ComfyUI")
  )
  foreach ($Candidate in $Candidates) {
    if (Test-UsablePath (Join-Path $Candidate "main.py")) {
      $ComfyRoot = $Candidate
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($ComfyRoot) -or -not (Test-UsablePath (Join-Path $ComfyRoot "main.py"))) {
  throw "ComfyUI main.py not found. Pass -ComfyRoot C:\path\to\ComfyUI or set CUSTOMCARD_COMFYUI_ROOT."
}

if (-not (Test-UsablePath $PythonPath)) {
  $ParentRoot = Split-Path -Parent $ComfyRoot
  $Candidates = @(
    (Join-Path $ParentRoot "python_embeded\python.exe"),
    (Join-Path $ParentRoot "python_embedded\python.exe"),
    "python"
  )
  foreach ($Candidate in $Candidates) {
    if ($Candidate -eq "python" -or (Test-UsablePath $Candidate)) {
      $PythonPath = $Candidate
      break
    }
  }
}

$BaseUrl = "http://$HostName`:$Port"
$ObjectInfoUrl = "$BaseUrl/object_info"

try {
  Invoke-RestMethod -Uri $ObjectInfoUrl -TimeoutSec 2 | Out-Null
  Write-Host "ComfyUI already running at $BaseUrl"
  Write-Host "Set CUSTOMCARD_COMFYUI_URL=$BaseUrl"
  exit 0
} catch {
  # Continue and start ComfyUI.
}

$LogDir = Join-Path $RepoRoot ".codex\tmp"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$StdoutLog = Join-Path $LogDir "comfyui-production-text-$Stamp.out.log"
$StderrLog = Join-Path $LogDir "comfyui-production-text-$Stamp.err.log"

$Args = @(
  "-I",
  "-W",
  "ignore::FutureWarning",
  "main.py",
  "--windows-standalone-build",
  "--listen",
  $HostName,
  "--port",
  [string]$Port
)

Start-Process `
  -FilePath $PythonPath `
  -ArgumentList $Args `
  -WorkingDirectory $ComfyRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $StdoutLog `
  -RedirectStandardError $StderrLog | Out-Null

$Deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
do {
  Start-Sleep -Seconds 2
  try {
    Invoke-RestMethod -Uri $ObjectInfoUrl -TimeoutSec 2 | Out-Null
    Write-Host "ComfyUI started at $BaseUrl"
    Write-Host "Set CUSTOMCARD_COMFYUI_URL=$BaseUrl"
    Write-Host "Logs: $StdoutLog ; $StderrLog"
    exit 0
  } catch {
    if ((Get-Date) -ge $Deadline) {
      throw "Timed out waiting for ComfyUI at $ObjectInfoUrl. Logs: $StdoutLog ; $StderrLog"
    }
  }
} while ($true)
