param(
  [Parameter(Mandatory = $true)]
  [string]$Base,
  [Parameter(Mandatory = $true)]
  [string]$Head,
  [Parameter(Mandatory = $true)]
  [string]$Out
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (Test-Path -LiteralPath $Out) {
  Remove-Item -LiteralPath $Out -Force
}

Add-Content -LiteralPath $Out -Encoding UTF8 -Value "# Review package: $Base..$Head"
Add-Content -LiteralPath $Out -Encoding UTF8 -Value ""
Add-Content -LiteralPath $Out -Encoding UTF8 -Value "## Commits"
git -C $repo log --oneline "$Base..$Head" | Add-Content -LiteralPath $Out -Encoding UTF8
Add-Content -LiteralPath $Out -Encoding UTF8 -Value ""
Add-Content -LiteralPath $Out -Encoding UTF8 -Value "## Files changed"
git -C $repo diff --stat "$Base..$Head" | Add-Content -LiteralPath $Out -Encoding UTF8
Add-Content -LiteralPath $Out -Encoding UTF8 -Value ""
Add-Content -LiteralPath $Out -Encoding UTF8 -Value "## Diff"
git -C $repo diff -U10 "$Base..$Head" | Add-Content -LiteralPath $Out -Encoding UTF8

Write-Output $Out
