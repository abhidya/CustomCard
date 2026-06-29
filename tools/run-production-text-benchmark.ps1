param(
  [string]$OutputDir = "",
  [string]$PhaseDir = "production-text-workflow",
  [string]$ComfyUrl = "http://127.0.0.1:8188",
  [string]$WorkflowPath = "comfyui-workflows/customcard-flux2-klein-production-text-overlay.json",
  [string]$WorkflowId = "customcard-flux2-klein-production-text-overlay",
  [string]$Checkpoint = "flux-2-klein-4b.safetensors",
  [int]$Steps = 4,
  [double]$Cfg = 1,
  [string]$Sampler = "euler",
  [string]$Scheduler = "",
  [long]$Seed = -1,
  [int]$Width = 960,
  [int]$Height = 1344,
  [int]$TimeoutMs = 900000,
  [string]$LocalLlmBaseUrl = "",
  [string]$LocalLlmModel = "",
  [string]$LocalLlmApiKey = "",
  [int]$LocalLlmPreflightTimeoutSec = 5,
  [int]$PlannerMaxTokens = 4096,
  [int]$PlannerContextSize = 8192,
  [int]$PlannerRequestTimeoutMs = 1200000,
  [string]$ProductionPlannerModelPath = "D:\models\gemma-4-31B-it-Q4_K_M.gguf",
  [int]$PlannerPort = 5013,
  [int]$PlannerThreads = 8,
  [int]$PlannerGpuId = 0,
  [int]$PlannerGpuLayers = 999,
  [int]$PlannerStartupTimeoutSec = 120,
  [switch]$NoAutoStartPlanner,
  [switch]$AllowUnknownProductionPlanner,
  [switch]$DryRun,
  [switch]$AllowCompositorFixtureFallback,
  [switch]$AllowSmallPlanner,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
if ($PlannerGpuId -lt 0) {
  [Console]::Error.WriteLine("PlannerGpuId must be 0 or greater.")
  exit 2
}
if ($PlannerGpuLayers -le 0) {
  [Console]::Error.WriteLine("PlannerGpuLayers $PlannerGpuLayers can allow CPU-backed AI. Use -PlannerGpuLayers 999 to request full GPU offload.")
  exit 2
}
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResolvedWorkflowPath = Resolve-Path (Join-Path $RepoRoot $WorkflowPath)
$NodeWrapper = Join-Path $PSScriptRoot "node.ps1"
$PreflightScript = Join-Path $RepoRoot "scripts\comfyui-production-text-preflight.mjs"
$PlannerPreflightScript = Join-Path $RepoRoot "scripts\production-text-planner-preflight.mjs"
$BenchmarkScript = Join-Path $RepoRoot "scripts\model-benchmark-loop.mjs"
$StartPlannerScript = Join-Path $PSScriptRoot "start-local-card-planner.ps1"
$BenchmarkEnvFromFiles = @{}
foreach ($EnvFile in @(".env.local", "infra/env/.env")) {
  $EnvPath = Join-Path $RepoRoot $EnvFile
  if (-not (Test-Path -LiteralPath $EnvPath)) {
    continue
  }
  foreach ($Line in Get-Content -LiteralPath $EnvPath) {
    if ($Line -notmatch "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") {
      continue
    }
    $Key = $Matches[1]
    $Value = $Matches[2].Trim()
    if (
      ($Value.StartsWith('"') -and $Value.EndsWith('"')) -or
      ($Value.StartsWith("'") -and $Value.EndsWith("'"))
    ) {
      $Value = $Value.Substring(1, $Value.Length - 2)
    }
    if (-not $BenchmarkEnvFromFiles.ContainsKey($Key)) {
      $BenchmarkEnvFromFiles[$Key] = $Value
    }
  }
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
  $OutputDir = "docs/evidence/generated-card-comparisons/production-text-workflow-$Stamp"
}

if (-not $SkipPreflight) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper `
    $PreflightScript `
    --comfy-url $ComfyUrl `
    --workflow-path $ResolvedWorkflowPath.Path `
    --require-live true
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

$env:CUSTOMCARD_COMFYUI_URL = $ComfyUrl
$env:CUSTOMCARD_COMFYUI_WORKFLOW_PATH = $ResolvedWorkflowPath.Path
$env:CUSTOMCARD_COMFYUI_WORKFLOW_ID = $WorkflowId
$env:CUSTOMCARD_COMFYUI_IMAGE_WIDTH = [string]$Width
$env:CUSTOMCARD_COMFYUI_IMAGE_HEIGHT = [string]$Height
$env:CUSTOMCARD_COMFYUI_TIMEOUT_MS = [string]$TimeoutMs
if (-not [string]::IsNullOrWhiteSpace($Checkpoint)) {
  $env:CUSTOMCARD_COMFYUI_CHECKPOINT = $Checkpoint
}
if ($Steps -gt 0) {
  $env:CUSTOMCARD_COMFYUI_STEPS = [string]$Steps
}
if ($Cfg -ge 0) {
  $env:CUSTOMCARD_COMFYUI_CFG = [string]$Cfg
}
if (-not [string]::IsNullOrWhiteSpace($Sampler)) {
  $env:CUSTOMCARD_COMFYUI_SAMPLER = $Sampler
}
if (-not [string]::IsNullOrWhiteSpace($Scheduler)) {
  $env:CUSTOMCARD_COMFYUI_SCHEDULER = $Scheduler
}
if ($Seed -ge 0) {
  $env:CUSTOMCARD_COMFYUI_SEED = [string]$Seed
}
if (-not [string]::IsNullOrWhiteSpace($LocalLlmBaseUrl)) {
  $env:CUSTOMCARD_LOCAL_LLM_BASE_URL = $LocalLlmBaseUrl
}
if (-not [string]::IsNullOrWhiteSpace($LocalLlmModel)) {
  $env:CUSTOMCARD_LOCAL_LLM_MODEL = $LocalLlmModel
}
if (-not [string]::IsNullOrWhiteSpace($LocalLlmApiKey)) {
  $env:CUSTOMCARD_LOCAL_LLM_API_KEY = $LocalLlmApiKey
}
$env:CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS = [string]$PlannerMaxTokens
$env:CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS = [string]$PlannerContextSize
$env:CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS = [string]$PlannerRequestTimeoutMs
$env:CUSTOMCARD_LOCAL_LLM_REQUIRE_MODEL_MATCH = "true"
if ($AllowSmallPlanner) {
  $env:CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER = "true"
}
if ($AllowUnknownProductionPlanner) {
  $env:CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER = "true"
}

function Test-UsableEnvValue {
  param([string]$Value)
  return -not [string]::IsNullOrWhiteSpace($Value) -and
    $Value.Trim() -ne "__UNSET__" -and
    $Value.Trim() -ne "placeholder" -and
    $Value.Trim() -ne "changeme"
}

function Get-FirstUsableEnvValue {
  param([string[]]$Keys)
  foreach ($Key in $Keys) {
    $Item = Get-Item -Path "Env:$Key" -ErrorAction SilentlyContinue
    if ($null -ne $Item -and (Test-UsableEnvValue $Item.Value)) {
      return $Item.Value.Trim()
    }
    if ($BenchmarkEnvFromFiles.ContainsKey($Key) -and (Test-UsableEnvValue $BenchmarkEnvFromFiles[$Key])) {
      return $BenchmarkEnvFromFiles[$Key].Trim()
    }
  }
  return ""
}

function Get-EndpointUri {
  param([string]$BaseUrl)
  try {
    return [Uri]$BaseUrl
  } catch {
    return $null
  }
}

function Test-LocalEndpoint {
  param([Uri]$Uri)
  if ($null -eq $Uri) {
    return $false
  }
  return $Uri.Host -eq "127.0.0.1" -or
    $Uri.Host -eq "localhost" -or
    $Uri.Host -eq "::1"
}

function Get-LocalKoboldPlannerProcess {
  param([int]$Port)
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
    throw "Cannot prove local KoboldCPP GPU residency because nvidia-smi was not found on PATH."
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

function Assert-LocalKoboldPlannerUsesGpu {
  param([string]$BaseUrl)
  $Uri = Get-EndpointUri $BaseUrl
  if (-not (Test-LocalEndpoint $Uri)) {
    return
  }
  $Port = $Uri.Port
  if ($Port -le 0) {
    return
  }
  $PlannerProcesses = Get-LocalKoboldPlannerProcess $Port
  if ($PlannerProcesses.Count -eq 0) {
    return
  }
  $GpuBackedPlanner = @($PlannerProcesses | Where-Object {
    Test-KoboldPlannerUsesGpu $_.CommandLine
  })
  if ($GpuBackedPlanner.Count -eq 0) {
    $ExistingCommand = ($PlannerProcesses | Select-Object -First 1).CommandLine
    throw "Refusing to run production-text benchmark against CPU-backed local KoboldCPP on $BaseUrl. Stop that process and restart with -GpuId/-GpuLayers. CommandLine: $ExistingCommand"
  }
  $NvidiaProcessIds = Get-NvidiaSmiProcessIds
  $GpuResidentPlanner = @($GpuBackedPlanner | Where-Object {
    $NvidiaProcessIds -contains [int]$_.ProcessId
  })
  if ($GpuResidentPlanner.Count -eq 0) {
    $PlannerPids = ($GpuBackedPlanner | ForEach-Object { [string]$_.ProcessId }) -join ", "
    throw "Refusing to run production-text benchmark because local KoboldCPP on $BaseUrl has GPU flags but no matching PID is listed by nvidia-smi. Candidate PID(s): $PlannerPids"
  }
  $GpuPid = ($GpuResidentPlanner | Select-Object -First 1).ProcessId
  Write-Host "Local Kobold GPU check: port $Port PID $GpuPid uses GPU offload and is listed by nvidia-smi."
}

$ResolvedLocalLlmBaseUrl = Get-FirstUsableEnvValue @(
  "CUSTOMCARD_LOCAL_LLM_BASE_URL",
  "LMSTUDIO_BASE_URL",
  "KOBOLDCPP_BASE_URL"
)
$CloudflareAccountId = Get-FirstUsableEnvValue @("CLOUDFLARE_ACCOUNT_ID")
$CloudflareTextToken = Get-FirstUsableEnvValue @(
  "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN",
  "CLOUDFLARE_API_TOKEN"
)
$HasCloudflareProductionText = (Test-UsableEnvValue $CloudflareAccountId) -and (Test-UsableEnvValue $CloudflareTextToken)
$NeedsLocalPlanner = -not $HasCloudflareProductionText
$HasLocalLlm = Test-UsableEnvValue $ResolvedLocalLlmBaseUrl
$RequestedLocalPlannerUri = if ($HasLocalLlm) { Get-EndpointUri $ResolvedLocalLlmBaseUrl } else { $null }
$RequestedDedicatedPlannerMissing = $NeedsLocalPlanner -and
  $HasLocalLlm -and
  -not $DryRun -and
  -not $NoAutoStartPlanner -and
  -not $AllowCompositorFixtureFallback -and
  (Test-LocalEndpoint $RequestedLocalPlannerUri) -and
  $RequestedLocalPlannerUri.Port -eq $PlannerPort -and
  @(Get-LocalKoboldPlannerProcess $PlannerPort).Count -eq 0

if ($NeedsLocalPlanner -and ((-not $HasLocalLlm) -or $RequestedDedicatedPlannerMissing) -and -not $DryRun -and -not $AllowCompositorFixtureFallback -and -not $NoAutoStartPlanner) {
  if ((Test-Path -LiteralPath $StartPlannerScript) -and (Test-Path -LiteralPath $ProductionPlannerModelPath)) {
    if ($RequestedDedicatedPlannerMissing) {
      Write-Host "Local LLM planner: $ResolvedLocalLlmBaseUrl is configured but no KoboldCPP listener was found on port $PlannerPort; auto-starting the configured production planner."
    }
    Write-Host "Local LLM planner: auto-starting production planner $ProductionPlannerModelPath on port $PlannerPort"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $StartPlannerScript `
      -ModelPath $ProductionPlannerModelPath `
      -Port $PlannerPort `
      -ContextSize $PlannerContextSize `
      -Threads $PlannerThreads `
      -GpuId $PlannerGpuId `
      -GpuLayers $PlannerGpuLayers `
      -StartupTimeoutSec $PlannerStartupTimeoutSec
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
    $ResolvedLocalLlmBaseUrl = "http://127.0.0.1:$PlannerPort/v1"
    $env:CUSTOMCARD_LOCAL_LLM_BASE_URL = $ResolvedLocalLlmBaseUrl
    if ([string]::IsNullOrWhiteSpace($LocalLlmModel)) {
      $env:CUSTOMCARD_LOCAL_LLM_MODEL = "koboldcpp/$(Split-Path -Leaf $ProductionPlannerModelPath)"
    }
    $HasLocalLlm = $true
  }
}

if ($NeedsLocalPlanner -and -not $HasLocalLlm -and -not $AllowCompositorFixtureFallback) {
  [Console]::Error.WriteLine("local-production-text requires Cloudflare Workers AI text credentials or a production-suitable local LLM planner for the LLM-planned customer request matrix. Configure CLOUDFLARE_ACCOUNT_ID plus CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN/CLOUDFLARE_API_TOKEN, let this script auto-start $ProductionPlannerModelPath, pass -LocalLlmBaseUrl and -LocalLlmModel for a stronger hosted/self-hosted endpoint, or pass -AllowCompositorFixtureFallback to run only the structural compositor fixture.")
  exit 2
}

if ($NeedsLocalPlanner -and $HasLocalLlm) {
  Assert-LocalKoboldPlannerUsesGpu $ResolvedLocalLlmBaseUrl
}

Write-Host "Production text benchmark output: $OutputDir"
if (-not [string]::IsNullOrWhiteSpace($Checkpoint)) {
  Write-Host "Checkpoint override: $Checkpoint"
}
if ($HasCloudflareProductionText) {
  Write-Host "Cloudflare Qwen3 text planner: enabled"
  if ($HasLocalLlm) {
    Write-Host "Local LLM planner: skipped because Cloudflare text planner is configured"
  }
}
if ($NeedsLocalPlanner -and $HasLocalLlm) {
  Write-Host "Local LLM planner: enabled"
  Write-Host "Local LLM planner request timeout: $PlannerRequestTimeoutMs ms"
  Write-Host "Local Kobold planner GPU requirement: GPU $PlannerGpuId, gpulayers $PlannerGpuLayers"
}
if ($NeedsLocalPlanner -and $AllowCompositorFixtureFallback -and -not $HasLocalLlm) {
  Write-Host "Local LLM planner: missing; compositor fixture fallback explicitly allowed"
}
if ($DryRun) {
  Write-Host "Dry run: enabled"
}

if ($NeedsLocalPlanner -and $HasLocalLlm -and -not $DryRun) {
  try {
    $LocalLlmApiKeyValue = Get-FirstUsableEnvValue @(
      "CUSTOMCARD_LOCAL_LLM_API_KEY",
      "LMSTUDIO_API_KEY",
      "KOBOLDCPP_API_KEY"
    )
    $PlannerModelName = Get-FirstUsableEnvValue @(
      "CUSTOMCARD_LOCAL_LLM_MODEL",
      "LMSTUDIO_MODEL",
      "KOBOLDCPP_MODEL"
    )
    $PlannerPreflightArgs = @(
      $PlannerPreflightScript,
      "--output-dir", $OutputDir,
      "--base-url", $ResolvedLocalLlmBaseUrl,
      "--timeout-ms", [string]($LocalLlmPreflightTimeoutSec * 1000),
      "--max-output-tokens", [string]$PlannerMaxTokens,
      "--reported-context-tokens", [string]$PlannerContextSize
    )
    if (Test-UsableEnvValue $PlannerModelName) {
      $PlannerPreflightArgs += @("--model", $PlannerModelName)
    }
    if (Test-UsableEnvValue $LocalLlmApiKeyValue) {
      $PlannerPreflightArgs += @("--api-key", $LocalLlmApiKeyValue)
    }
    if ($AllowSmallPlanner) {
      $PlannerPreflightArgs += "--allow-small"
    }
    if ($AllowUnknownProductionPlanner) {
      $PlannerPreflightArgs += "--allow-unknown-production-model"
    }
    Write-Host "Local LLM production planner preflight: $ResolvedLocalLlmBaseUrl"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper @PlannerPreflightArgs
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } catch {
    [Console]::Error.WriteLine("Local LLM production planner preflight failed. Start a production-suitable OpenAI-compatible text server, verify -LocalLlmBaseUrl, or use -DryRun for planning only. $($_.Exception.Message)")
    exit 3
  }
}

$BenchmarkArgs = @(
  $BenchmarkScript,
  "--phase", "local-production-text",
  "--phase-dir", $PhaseDir,
  "--output-dir", $OutputDir,
  "--workflow-id", $WorkflowId,
  "--workflow-path", $ResolvedWorkflowPath.Path,
  "--comfy-width", [string]$Width,
  "--comfy-height", [string]$Height,
  "--comfy-timeout-ms", [string]$TimeoutMs
)
if ($Steps -gt 0) {
  $BenchmarkArgs += @("--comfy-steps", [string]$Steps)
}
if ($Cfg -ge 0) {
  $BenchmarkArgs += @("--comfy-cfg", [string]$Cfg)
}
if (-not [string]::IsNullOrWhiteSpace($Sampler)) {
  $BenchmarkArgs += @("--comfy-sampler", $Sampler)
}
if (-not [string]::IsNullOrWhiteSpace($Scheduler)) {
  $BenchmarkArgs += @("--comfy-scheduler", $Scheduler)
}
if ($Seed -ge 0) {
  $BenchmarkArgs += @("--comfy-seed", [string]$Seed)
}
if (-not [string]::IsNullOrWhiteSpace($Checkpoint)) {
  $BenchmarkArgs += @("--comfy-checkpoint", $Checkpoint)
}
if (-not $DryRun) {
  $BenchmarkArgs += @("--live", "true")
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper @BenchmarkArgs

exit $LASTEXITCODE
