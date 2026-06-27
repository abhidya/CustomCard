param(
  [string]$KoboldBin = "D:\models\koboldcpp.exe",
  [string]$ModelPath = "D:\models\gemma-4-31B-it-Q4_K_M.gguf",
  [int]$Port = 5013,
  [string]$HostName = "127.0.0.1",
  [int]$ContextSize = 8192,
  [int]$Threads = 1,
  [int]$GpuId = 0,
  [int]$GpuLayers = 999,
  [switch]$AllowCpuAi,
  [int]$StartupTimeoutSec = 120
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $KoboldBin)) {
  throw "KoboldCPP binary not found: $KoboldBin"
}
if (-not (Test-Path -LiteralPath $ModelPath)) {
  throw "Planner model not found: $ModelPath"
}
if ($GpuId -lt 0) {
  throw "GpuId must be 0 or greater."
}
if ($GpuLayers -le 0 -and -not $AllowCpuAi) {
  throw "GpuLayers $GpuLayers can allow CPU-backed AI. Use -GpuLayers 999 to request full GPU offload. Pass -AllowCpuAi only for explicit CPU debugging."
}

$BaseUrl = "http://$HostName`:$Port/v1"
$ModelsUrl = "$BaseUrl/models"

function Get-LocalKoboldPlannerProcess {
  $PortPattern = "(^|\s)--port\s+$Port(\s|$)"
  return @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -ieq "koboldcpp.exe" -and
    $_.CommandLine -match $PortPattern
  })
}

function Test-KoboldPlannerUsesGpu {
  param([string]$CommandLine)
  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }
  $UsesGpuBackend = $CommandLine -match "(^|\s)--use(cuda|cublas|hipblas|vulkan)(\s|$)"
  $ExplicitGpuLayers = $CommandLine -match "(^|\s)--(gpulayers|gpu-layers|n-gpu-layers|ngl)\s+[1-9][0-9]*(\s|$)"
  $CpuOnly = $CommandLine -match "(^|\s)--usecpu(\s|$)"
  $ZeroGpuLayers = $CommandLine -match "(^|\s)--(gpulayers|gpu-layers|n-gpu-layers|ngl)\s+0(\s|$)"
  return $UsesGpuBackend -and $ExplicitGpuLayers -and -not $CpuOnly -and -not $ZeroGpuLayers
}

function Normalize-ModelId {
  param([string]$Value)
  $Text = [System.IO.Path]::GetFileName($Value).Trim().ToLowerInvariant()
  if ($Text.StartsWith("koboldcpp/")) {
    $Text = $Text.Substring("koboldcpp/".Length)
  }
  if ($Text.EndsWith(".gguf")) {
    $Text = $Text.Substring(0, $Text.Length - ".gguf".Length)
  }
  return $Text
}

$ModelsResponse = $null
try {
  $ModelsResponse = Invoke-RestMethod -Uri $ModelsUrl -TimeoutSec 2
} catch {
  $ModelsResponse = $null
}

if ($null -ne $ModelsResponse) {
  $ExpectedModel = Normalize-ModelId (Split-Path -Leaf $ModelPath)
  $ReportedModels = @($ModelsResponse.data | ForEach-Object { [string]$_.id })
  $ReportedModelMatch = @($ReportedModels | Where-Object {
    (Normalize-ModelId $_) -eq $ExpectedModel
  })
  if ($ReportedModelMatch.Count -eq 0) {
    throw "Local card planner is already reachable at $BaseUrl, but it is not serving the requested model '$ExpectedModel'. Reported models: $($ReportedModels -join ', ')"
  }
  $ExistingPlannerProcesses = Get-LocalKoboldPlannerProcess
  $GpuBackedPlanner = @($ExistingPlannerProcesses | Where-Object {
    Test-KoboldPlannerUsesGpu $_.CommandLine
  })
  if ($ExistingPlannerProcesses.Count -gt 0 -and $GpuBackedPlanner.Count -eq 0 -and -not $AllowCpuAi) {
    $ExistingCommand = ($ExistingPlannerProcesses | Select-Object -First 1).CommandLine
    throw "Local card planner is already reachable at $BaseUrl, but the KoboldCPP process is not GPU-backed. Stop it and rerun this script. CommandLine: $ExistingCommand"
  }
  Write-Host "Local card planner already running at $BaseUrl"
  if ($GpuBackedPlanner.Count -gt 0) {
    Write-Host "GPU planner check: existing KoboldCPP process uses GPU offload."
  }
  Write-Host "Set CUSTOMCARD_LOCAL_LLM_BASE_URL=$BaseUrl"
  Write-Host "Set CUSTOMCARD_LOCAL_LLM_MODEL=koboldcpp/$(Split-Path -Leaf $ModelPath)"
  exit 0
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
  "--jinja",
  "--quiet"
)

if ($AllowCpuAi -and $GpuLayers -eq 0) {
  $Args += "--usecpu"
} else {
  $Args += @(
    "--usecuda", [string]$GpuId,
    "--maingpu", [string]$GpuId,
    "--gpulayers", [string]$GpuLayers
  )
}

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
    $StartedPlannerProcesses = Get-LocalKoboldPlannerProcess
    if ($StartedPlannerProcesses.Count -eq 0) {
      throw "Local card planner responded at $ModelsUrl but no matching KoboldCPP process was found. Logs: $StdoutLog ; $StderrLog"
    }
    Write-Host "Local card planner started at $BaseUrl"
    if (-not ($AllowCpuAi -and $GpuLayers -eq 0)) {
      Write-Host "GPU planner: CUDA device $GpuId, gpulayers $GpuLayers"
    }
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
