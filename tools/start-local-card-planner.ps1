param(
  [string]$KoboldBin = "D:\models\koboldcpp.exe",
  [string]$ModelPath = "D:\models\gemma-4-31B-it-Q4_K_M.gguf",
  [int]$Port = 5003,
  [string]$HostName = "127.0.0.1",
  [int]$ContextSize = 8192,
  [int]$Threads = 8,
  [int]$GpuLayers = 0,
  [int]$StartupTimeoutSec = 120
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $KoboldBin)) {
  throw "KoboldCPP binary not found: $KoboldBin"
}
if (-not (Test-Path -LiteralPath $ModelPath)) {
  throw "Planner model not found: $ModelPath"
}

$BaseUrl = "http://$HostName`:$Port/v1"
$ModelsUrl = "$BaseUrl/models"

try {
  Invoke-RestMethod -Uri $ModelsUrl -TimeoutSec 2 | Out-Null
  Write-Host "Local card planner already running at $BaseUrl"
  Write-Host "Set CUSTOMCARD_LOCAL_LLM_BASE_URL=$BaseUrl"
  Write-Host "Set CUSTOMCARD_LOCAL_LLM_MODEL=koboldcpp/$(Split-Path -Leaf $ModelPath)"
  exit 0
} catch {
  # Continue and start the planner.
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $RepoRoot ".codex\tmp"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$StdoutLog = Join-Path $LogDir "koboldcpp-card-planner-$Stamp.out.log"
$StderrLog = Join-Path $LogDir "koboldcpp-card-planner-$Stamp.err.log"

$Args = @(
  "--model", $ModelPath,
  "--port", [string]$Port,
  "--host", $HostName,
  "--skiplauncher",
  "--contextsize", [string]$ContextSize,
  "--threads", [string]$Threads,
  "--gpulayers", [string]$GpuLayers,
  "--jinja",
  "--quiet"
)

Start-Process `
  -FilePath $KoboldBin `
  -ArgumentList $Args `
  -WorkingDirectory (Split-Path -Parent $KoboldBin) `
  -WindowStyle Hidden `
  -RedirectStandardOutput $StdoutLog `
  -RedirectStandardError $StderrLog | Out-Null

$Deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
do {
  Start-Sleep -Seconds 2
  try {
    Invoke-RestMethod -Uri $ModelsUrl -TimeoutSec 2 | Out-Null
    Write-Host "Local card planner started at $BaseUrl"
    Write-Host "Set CUSTOMCARD_LOCAL_LLM_BASE_URL=$BaseUrl"
    Write-Host "Set CUSTOMCARD_LOCAL_LLM_MODEL=koboldcpp/$(Split-Path -Leaf $ModelPath)"
    Write-Host "Logs: $StdoutLog ; $StderrLog"
    exit 0
  } catch {
    if ((Get-Date) -ge $Deadline) {
      throw "Timed out waiting for local card planner at $ModelsUrl. Logs: $StdoutLog ; $StderrLog"
    }
  }
} while ($true)
