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

function Get-NvidiaSmiProcessIds {
  $NvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
  if ($null -eq $NvidiaSmi) {
    throw "Cannot prove local card planner GPU residency because nvidia-smi was not found on PATH."
  }

  $ProcessIds = @()
  $QueryOutput = @(& $NvidiaSmi.Source --query-compute-apps=pid --format=csv,noheader,nounits 2>$null)
  foreach ($Line in $QueryOutput) {
    if ([string]$Line -match "^\s*(\d+)\s*$") {
      $ProcessIds += [int]$Matches[1]
    }
  }
  if ($ProcessIds.Count -gt 0) {
    return @($ProcessIds | Select-Object -Unique)
  }

  $TableOutput = @(& $NvidiaSmi.Source 2>$null)
  foreach ($Line in $TableOutput) {
    if ([string]$Line -match "\|\s+\d+\s+N/A\s+N/A\s+(\d+)\s+(?:C|G|C\+G)\s+") {
      $ProcessIds += [int]$Matches[1]
    }
  }
  return @($ProcessIds | Select-Object -Unique)
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
  $GpuResidentPlanner = @()
  if ($GpuBackedPlanner.Count -gt 0 -and -not $AllowCpuAi) {
    $NvidiaProcessIds = Get-NvidiaSmiProcessIds
    $GpuResidentPlanner = @($GpuBackedPlanner | Where-Object {
      $NvidiaProcessIds -contains [int]$_.ProcessId
    })
    if ($GpuResidentPlanner.Count -eq 0) {
      $PlannerPids = ($GpuBackedPlanner | ForEach-Object { [string]$_.ProcessId }) -join ", "
      throw "Local card planner is already reachable at $BaseUrl with GPU flags, but no matching PID is listed by nvidia-smi. Candidate PID(s): $PlannerPids"
    }
  }
  Write-Host "Local card planner already running at $BaseUrl"
  if ($GpuResidentPlanner.Count -gt 0) {
    $GpuPid = ($GpuResidentPlanner | Select-Object -First 1).ProcessId
    Write-Host "GPU planner check: existing KoboldCPP PID $GpuPid uses GPU offload and is listed by nvidia-smi."
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
  "--singleinstance",
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
    $StartedGpuBackedPlanner = @($StartedPlannerProcesses | Where-Object {
      Test-KoboldPlannerUsesGpu $_.CommandLine
    })
    if ($StartedGpuBackedPlanner.Count -eq 0 -and -not ($AllowCpuAi -and $GpuLayers -eq 0)) {
      $ExistingCommand = ($StartedPlannerProcesses | Select-Object -First 1).CommandLine
      throw "Local card planner responded at $ModelsUrl, but the KoboldCPP process is not GPU-backed. Logs: $StdoutLog ; $StderrLog ; CommandLine: $ExistingCommand"
    }
    $StartedGpuResidentPlanner = @()
    if ($StartedGpuBackedPlanner.Count -gt 0 -and -not ($AllowCpuAi -and $GpuLayers -eq 0)) {
      $NvidiaProcessIds = Get-NvidiaSmiProcessIds
      $StartedGpuResidentPlanner = @($StartedGpuBackedPlanner | Where-Object {
        $NvidiaProcessIds -contains [int]$_.ProcessId
      })
      if ($StartedGpuResidentPlanner.Count -eq 0) {
        $PlannerPids = ($StartedGpuBackedPlanner | ForEach-Object { [string]$_.ProcessId }) -join ", "
        throw "Local card planner responded at $ModelsUrl with GPU flags, but no matching PID is listed by nvidia-smi. Candidate PID(s): $PlannerPids ; Logs: $StdoutLog ; $StderrLog"
      }
    }
    Write-Host "Local card planner started at $BaseUrl"
    if (-not ($AllowCpuAi -and $GpuLayers -eq 0)) {
      $GpuPid = ($StartedGpuResidentPlanner | Select-Object -First 1).ProcessId
      Write-Host "GPU planner: CUDA device $GpuId, gpulayers $GpuLayers, PID $GpuPid listed by nvidia-smi"
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
