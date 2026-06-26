param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$NodeVersion = "v24.18.0"
$PackageName = "node-$NodeVersion-win-x64"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RuntimeRoot = Join-Path $RepoRoot ".codex\runtime\node"
$InstallDir = Join-Path $RuntimeRoot $PackageName
$NodeExe = Join-Path $InstallDir "node.exe"

function Resolve-FullPath([string]$Path) {
  return [System.IO.Path]::GetFullPath($Path)
}

function Remove-RuntimeDirectory([string]$Path) {
  $fullPath = Resolve-FullPath $Path
  $fullRuntimeRoot = Resolve-FullPath $RuntimeRoot
  if (-not $fullPath.StartsWith($fullRuntimeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove a path outside .codex runtime: $fullPath"
  }
  if (Test-Path -LiteralPath $fullPath) {
    Remove-Item -LiteralPath $fullPath -Recurse -Force
  }
}

function Write-Step([string]$Message) {
  if (-not $Quiet) {
    Write-Host $Message
  }
}

function Invoke-Download([string]$Url, [string]$OutFile) {
  $TempFile = "$OutFile.downloading"
  if (Test-Path -LiteralPath $TempFile) {
    Remove-Item -LiteralPath $TempFile -Force
  }
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    & $curl.Source -fL --retry 3 --connect-timeout 20 --output $TempFile $Url
    if ($LASTEXITCODE -ne 0) {
      if (Test-Path -LiteralPath $TempFile) {
        Remove-Item -LiteralPath $TempFile -Force
      }
      throw "curl failed to download $Url"
    }
  } else {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $TempFile
  }
  $download = Get-Item -LiteralPath $TempFile
  if ($download.Length -le 0) {
    Remove-Item -LiteralPath $TempFile -Force
    throw "Downloaded file was empty: $Url"
  }
  Move-Item -LiteralPath $TempFile -Destination $OutFile -Force
}

if (Test-Path -LiteralPath $NodeExe) {
  Write-Output $InstallDir
  exit 0
}

if (-not [Environment]::Is64BitOperatingSystem) {
  throw "CustomCard's local Node runtime installer currently expects 64-bit Windows."
}

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

$ZipPath = Join-Path $RuntimeRoot "$PackageName.zip"
$ShasumPath = Join-Path $RuntimeRoot "SHASUMS256-$NodeVersion.txt"
$ZipUrl = "https://nodejs.org/dist/$NodeVersion/$PackageName.zip"
$ShasumUrl = "https://nodejs.org/dist/$NodeVersion/SHASUMS256.txt"

if (-not (Test-Path -LiteralPath $ZipPath)) {
  Write-Step "Downloading $PackageName..."
  Invoke-Download $ZipUrl $ZipPath
} elseif ((Get-Item -LiteralPath $ZipPath).Length -le 0) {
  Remove-Item -LiteralPath $ZipPath -Force
  Write-Step "Redownloading empty $PackageName archive..."
  Invoke-Download $ZipUrl $ZipPath
}

if (-not (Test-Path -LiteralPath $ShasumPath)) {
  Invoke-Download $ShasumUrl $ShasumPath
} elseif ((Get-Item -LiteralPath $ShasumPath).Length -le 0) {
  Remove-Item -LiteralPath $ShasumPath -Force
  Invoke-Download $ShasumUrl $ShasumPath
}

$expectedLine = Select-String -Path $ShasumPath -Pattern " $([regex]::Escape("$PackageName.zip"))$" | Select-Object -First 1
if (-not $expectedLine) {
  throw "Could not find $PackageName.zip in Node SHASUMS256.txt."
}

$expectedHash = ($expectedLine.Line -split "\s+")[0].ToLowerInvariant()
$actualHash = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) {
  Remove-Item -LiteralPath $ZipPath -Force
  throw "Node runtime SHA256 mismatch. Removed $ZipPath; rerun the installer to download it again."
}

$ExtractDir = Join-Path $RuntimeRoot "$PackageName.extracting"
Remove-RuntimeDirectory $ExtractDir
Remove-RuntimeDirectory $InstallDir

Write-Step "Extracting $PackageName..."
New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $ExtractDir -Force
Move-Item -LiteralPath (Join-Path $ExtractDir $PackageName) -Destination $InstallDir
Remove-RuntimeDirectory $ExtractDir

Set-Content -Path (Join-Path $RuntimeRoot "current.txt") -Value $InstallDir -Encoding ASCII
Write-Output $InstallDir
