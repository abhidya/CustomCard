$ErrorActionPreference = "Stop"
$nodeDir = & (Join-Path $PSScriptRoot "ensure-node.ps1") -Quiet
$nodeExe = Join-Path $nodeDir "node.exe"
$npxCli = Join-Path $nodeDir "node_modules\npm\bin\npx-cli.js"
$env:PATH = "$nodeDir;$env:PATH"
& $nodeExe $npxCli @args
exit $LASTEXITCODE
