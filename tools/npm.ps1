$ErrorActionPreference = "Stop"
$nodeDir = & (Join-Path $PSScriptRoot "ensure-node.ps1") -Quiet
$nodeExe = Join-Path $nodeDir "node.exe"
$npmCli = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
$env:PATH = "$nodeDir;$env:PATH"
& $nodeExe $npmCli @args
exit $LASTEXITCODE
