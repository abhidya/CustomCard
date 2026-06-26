[CmdletBinding()]
param(
  [string]$ComfyRoot = $env:CUSTOMCARD_COMFYUI_ROOT,
  [string]$CustomNodesPath = $env:CUSTOMCARD_COMFYUI_CUSTOM_NODES,
  [switch]$Copy
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "comfyui-custom-nodes\CustomCardTextComposer"

if (-not (Test-Path -LiteralPath $source -PathType Container)) {
  throw "CustomCardTextComposer source not found at $source"
}

if (-not $CustomNodesPath) {
  if (-not $ComfyRoot) {
    $candidates = @(
      (Join-Path $repoRoot ".codex\ComfyUI"),
      (Join-Path $repoRoot ".codex\comfyui\ComfyUI"),
      (Join-Path $repoRoot "ComfyUI")
    )
    foreach ($candidate in $candidates) {
      if (Test-Path -LiteralPath (Join-Path $candidate "custom_nodes") -PathType Container) {
        $ComfyRoot = $candidate
        break
      }
    }
  }
  if ($ComfyRoot) {
    $CustomNodesPath = Join-Path $ComfyRoot "custom_nodes"
  }
}

if (-not $CustomNodesPath -or -not (Test-Path -LiteralPath $CustomNodesPath -PathType Container)) {
  throw "ComfyUI custom_nodes path not found. Pass -ComfyRoot C:\path\to\ComfyUI or set CUSTOMCARD_COMFYUI_CUSTOM_NODES."
}

$target = Join-Path $CustomNodesPath "CustomCardTextComposer"
if (Test-Path -LiteralPath $target) {
  Write-Host "CustomCardTextComposer already exists at $target"
  Write-Host "Restart ComfyUI if this is a fresh install."
  exit 0
}

if ($Copy) {
  Copy-Item -LiteralPath $source -Destination $target -Recurse
  Write-Host "Copied CustomCardTextComposer to $target"
} else {
  New-Item -ItemType Junction -Path $target -Target $source | Out-Null
  Write-Host "Linked CustomCardTextComposer to $target"
}

Write-Host "Restart ComfyUI, then confirm /object_info contains CustomCardTextComposer."
