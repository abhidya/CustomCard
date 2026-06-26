param(
  [string]$OutputDir = "docs/evidence/generated-card-comparisons/production-text-workflow",
  [string]$PhaseDir = "production-text-workflow",
  [string]$ComfyUrl = "http://127.0.0.1:8188",
  [string]$WorkflowPath = "comfyui-workflows/customcard-production-text-overlay.json",
  [string]$WorkflowId = "customcard-production-text-overlay",
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

& powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper `
  $BenchmarkScript `
  --phase local `
  --live true `
  --local-only true `
  --phase-dir $PhaseDir `
  --output-dir $OutputDir

exit $LASTEXITCODE
