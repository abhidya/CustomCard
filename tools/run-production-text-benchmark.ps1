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
  [switch]$DryRun,
  [switch]$AllowCompositorFixtureFallback,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResolvedWorkflowPath = Resolve-Path (Join-Path $RepoRoot $WorkflowPath)
$NodeWrapper = Join-Path $PSScriptRoot "node.ps1"
$PreflightScript = Join-Path $RepoRoot "scripts\comfyui-production-text-preflight.mjs"
$BenchmarkScript = Join-Path $RepoRoot "scripts\model-benchmark-loop.mjs"

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

function Resolve-LocalLlmModelsUrl {
  param([string]$BaseUrl)

  try {
    $Builder = [System.UriBuilder]$BaseUrl
  } catch {
    throw "Local LLM base URL is invalid: $BaseUrl"
  }

  $HostName = $Builder.Host.ToLowerInvariant()
  $AllowedHosts = @("localhost", "127.0.0.1", "::1", "0.0.0.0")
  if ($Builder.Scheme -ne "http" -or -not ($AllowedHosts -contains $HostName)) {
    throw "Local LLM base URL must be a localhost HTTP URL, got $BaseUrl"
  }

  $Path = $Builder.Path.TrimEnd("/")
  if ($Path.EndsWith("/chat/completions")) {
    $Path = $Path.Substring(0, $Path.Length - "/chat/completions".Length).TrimEnd("/")
  }
  if (-not $Path.EndsWith("/v1")) {
    $Path = "$Path/v1".Replace("//", "/")
  }
  $Builder.Path = "$($Path.TrimStart("/"))/models"
  $Builder.Query = ""
  $Builder.Fragment = ""
  return $Builder.Uri.AbsoluteUri
}

$ResolvedLocalLlmBaseUrl = Get-FirstUsableEnvValue @(
  "CUSTOMCARD_LOCAL_LLM_BASE_URL",
  "LMSTUDIO_BASE_URL",
  "KOBOLDCPP_BASE_URL"
)
$HasLocalLlm = Test-UsableEnvValue $ResolvedLocalLlmBaseUrl

if (-not $HasLocalLlm -and -not $AllowCompositorFixtureFallback) {
  [Console]::Error.WriteLine("local-production-text requires a local LLM for the LLM-planned customer request matrix. Pass -LocalLlmBaseUrl http://127.0.0.1:1234 or -LocalLlmBaseUrl http://127.0.0.1:1234/v1 and -LocalLlmModel <model>, set CUSTOMCARD_LOCAL_LLM_BASE_URL/LMSTUDIO_BASE_URL/KOBOLDCPP_BASE_URL, or pass -AllowCompositorFixtureFallback to run only the structural compositor fixture.")
  exit 2
}

Write-Host "Production text benchmark output: $OutputDir"
if (-not [string]::IsNullOrWhiteSpace($Checkpoint)) {
  Write-Host "Checkpoint override: $Checkpoint"
}
if ($HasLocalLlm) {
  Write-Host "Local LLM planner: enabled"
}
if ($AllowCompositorFixtureFallback -and -not $HasLocalLlm) {
  Write-Host "Local LLM planner: missing; compositor fixture fallback explicitly allowed"
}
if ($DryRun) {
  Write-Host "Dry run: enabled"
}

if ($HasLocalLlm -and -not $DryRun -and -not $SkipPreflight) {
  try {
    $LocalLlmModelsUrl = Resolve-LocalLlmModelsUrl $ResolvedLocalLlmBaseUrl
    $LocalLlmApiKeyValue = Get-FirstUsableEnvValue @(
      "CUSTOMCARD_LOCAL_LLM_API_KEY",
      "LMSTUDIO_API_KEY",
      "KOBOLDCPP_API_KEY"
    )
    $Headers = @{}
    if (Test-UsableEnvValue $LocalLlmApiKeyValue) {
      $Headers["Authorization"] = "Bearer $LocalLlmApiKeyValue"
    }
    Write-Host "Local LLM preflight: $LocalLlmModelsUrl"
    Invoke-RestMethod -Uri $LocalLlmModelsUrl -Headers $Headers -TimeoutSec $LocalLlmPreflightTimeoutSec | Out-Null
  } catch {
    [Console]::Error.WriteLine("Local LLM preflight failed. Start the OpenAI-compatible local text server, verify -LocalLlmBaseUrl, or use -DryRun for planning only. $($_.Exception.Message)")
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
