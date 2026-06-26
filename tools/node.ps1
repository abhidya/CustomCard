$ErrorActionPreference = "Stop"
$nodeDir = & (Join-Path $PSScriptRoot "ensure-node.ps1") -Quiet
$nodeExe = Join-Path $nodeDir "node.exe"
$env:PATH = "$nodeDir;$env:PATH"
& $nodeExe @args
exit $LASTEXITCODE
