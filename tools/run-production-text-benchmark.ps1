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

Write-Host "Production text benchmark output: $OutputDir"
if (-not [string]::IsNullOrWhiteSpace($Checkpoint)) {
  Write-Host "Checkpoint override: $Checkpoint"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper `
  $BenchmarkScript `
  --phase local-production-text `
  --live true `
  --local-only true `
  --phase-dir $PhaseDir `
  --output-dir $OutputDir

exit $LASTEXITCODE
