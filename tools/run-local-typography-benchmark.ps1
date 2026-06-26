param(
  [string]$OutputDir = "docs/evidence/generated-card-comparisons/local-typography-hybrid-20260626",
  [string]$PhaseDir = "local-typography-hybrid",
  [string]$ComfyUrl = "http://127.0.0.1:8188",
  [string]$WorkflowPath = "comfyui-workflows/customcard-hybrid-reserved-layout.json",
  [string]$WorkflowId = "customcard-hybrid-reserved-layout",
  [int]$Width = 960,
  [int]$Height = 1344,
  [int]$TimeoutMs = 900000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResolvedWorkflowPath = Resolve-Path (Join-Path $RepoRoot $WorkflowPath)
$NodeWrapper = Join-Path $PSScriptRoot "node.ps1"
$BenchmarkScript = Join-Path $RepoRoot "scripts\model-benchmark-loop.mjs"

$env:CUSTOMCARD_COMFYUI_URL = $ComfyUrl
$env:CUSTOMCARD_COMFYUI_WORKFLOW_PATH = $ResolvedWorkflowPath.Path
$env:CUSTOMCARD_COMFYUI_WORKFLOW_ID = $WorkflowId
$env:CUSTOMCARD_COMFYUI_IMAGE_WIDTH = [string]$Width
$env:CUSTOMCARD_COMFYUI_IMAGE_HEIGHT = [string]$Height
$env:CUSTOMCARD_COMFYUI_TIMEOUT_MS = [string]$TimeoutMs

& powershell -NoProfile -ExecutionPolicy Bypass -File $NodeWrapper `
  $BenchmarkScript `
  --phase local-typography `
  --live true `
  --local-only true `
  --phase-dir $PhaseDir `
  --output-dir $OutputDir

exit $LASTEXITCODE
