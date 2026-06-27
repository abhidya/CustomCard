param(
  [string]$OutputDir = "",
  [string]$PhaseDir = "production-text-workflow",
  [string]$ComfyUrl = "http://127.0.0.1:8188",
  [string]$WorkflowPath = "comfyui-workflows/customcard-production-text-overlay.json",
  [string]$WorkflowId = "customcard-production-text-overlay",
  [string]$Checkpoint = "",
  [int]$Steps = 0,
  [double]$Cfg = -1,
  [string]$Sampler = "",
  [string]$Scheduler = "",
  [long]$Seed = -1,
  [int]$Width = 960,
  [int]$Height = 1344,
  [int]$TimeoutMs = 900000,
  [string]$LocalLlmBaseUrl = "",
  [string]$LocalLlmModel = "",
  [string]$LocalLlmApiKey = "",
  [int]$LocalLlmPreflightTimeoutSec = 5,
  [int]$PlannerMaxTokens = 3200,
  [int]$PlannerContextSize = 8192,
  [int]$PlannerRequestTimeoutMs = 1200000,
  [string]$ProductionPlannerModelPath = "D:\models\gemma-4-31B-it-Q4_K_M.gguf",
  [int]$PlannerPort = 5003,
  [int]$PlannerThreads = 8,
  [int]$PlannerGpuLayers = 0,
  [int]$PlannerStartupTimeoutSec = 120,
  [switch]$NoAutoStartPlanner,
  [switch]$AllowUnknownProductionPlanner,
  [switch]$DryRun,
  [switch]$AllowCompositorFixtureFallback,
  [switch]$AllowSmallPlanner,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResolvedWorkflowPath = Resolve-Path (Join-Path $RepoRoot $WorkflowPath)
$NodeWrapper = Join-Path $PSScriptRoot "node.ps1"
$PreflightScript = Join-Path $RepoRoot "scripts\comfyui-production-text-preflight.mjs"
$PlannerPreflightScript = Join-Path $RepoRoot "scripts\production-text-planner-preflight.mjs"
$BenchmarkScript = Join-Path $RepoRoot "scripts\model-benchmark-loop.mjs"
$StartPlannerScript = Join-Path $PSScriptRoot "start-local-card-planner.ps1"

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
  }
  return ""
}

$ResolvedLocalLlmBaseUrl = Get-FirstUsableEnvValue @(
  "CUSTOMCARD_LOCAL_LLM_BASE_URL",
  "LMSTUDIO_BASE_URL",
  "KOBOLDCPP_BASE_URL"
)
$HasLocalLlm = Test-UsableEnvValue $ResolvedLocalLlmBaseUrl

if (-not $HasLocalLlm -and -not $AllowCompositorFixtureFallback -and -not $NoAutoStartPlanner) {
  if ((Test-Path -LiteralPath $StartPlannerScript) -and (Test-Path -LiteralPath $ProductionPlannerModelPath)) {
    Write-Host "Local LLM planner: auto-starting production planner $ProductionPlannerModelPath on port $PlannerPort"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $StartPlannerScript `
      -ModelPath $ProductionPlannerModelPath `
      -Port $PlannerPort `
      -ContextSize $PlannerContextSize `
      -Threads $PlannerThreads `
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

if (-not $HasLocalLlm -and -not $AllowCompositorFixtureFallback) {
  [Console]::Error.WriteLine("local-production-text requires a production-suitable LLM planner for the LLM-planned customer request matrix. Let this script auto-start $ProductionPlannerModelPath, pass -LocalLlmBaseUrl and -LocalLlmModel for a stronger hosted/self-hosted endpoint, set CUSTOMCARD_LOCAL_LLM_BASE_URL/LMSTUDIO_BASE_URL/KOBOLDCPP_BASE_URL, or pass -AllowCompositorFixtureFallback to run only the structural compositor fixture.")
  exit 2
}

Write-Host "Production text benchmark output: $OutputDir"
if (-not [string]::IsNullOrWhiteSpace($Checkpoint)) {
  Write-Host "Checkpoint override: $Checkpoint"
}
if ($HasLocalLlm) {
  Write-Host "Local LLM planner: enabled"
  Write-Host "Local LLM planner request timeout: $PlannerRequestTimeoutMs ms"
}
if ($AllowCompositorFixtureFallback -and -not $HasLocalLlm) {
  Write-Host "Local LLM planner: missing; compositor fixture fallback explicitly allowed"
}
if ($DryRun) {
  Write-Host "Dry run: enabled"
}

if ($HasLocalLlm -and -not $DryRun) {
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
  "--local-only", "true",
  "--phase-dir", $PhaseDir,
  "--output-dir", $OutputDir
)
if (-not $DryRun) {
  $BenchmarkArgs += @("--live", "true")
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper @BenchmarkArgs

exit $LASTEXITCODE
