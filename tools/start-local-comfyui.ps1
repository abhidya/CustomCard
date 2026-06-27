param(
  [string]$ComfyRoot = $env:CUSTOMCARD_COMFYUI_ROOT,
  [string]$PythonPath = "",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8188,
  [int]$StartupTimeoutSec = 600,
  [string]$ReadinessPath = "/system_stats"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-UsablePath {
  param([string]$Path)
  return -not [string]::IsNullOrWhiteSpace($Path) -and (Test-Path -LiteralPath $Path)
}

if (-not (Test-UsablePath $ComfyRoot)) {
  $Candidates = @(
    "D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI",
    (Join-Path $RepoRoot ".codex\comfyui\ComfyUI"),
    (Join-Path $RepoRoot "ComfyUI")
  )
  foreach ($Candidate in $Candidates) {
    if (Test-UsablePath (Join-Path $Candidate "main.py")) {
      $ComfyRoot = $Candidate
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($ComfyRoot) -or -not (Test-UsablePath (Join-Path $ComfyRoot "main.py"))) {
  throw "ComfyUI main.py not found. Pass -ComfyRoot C:\path\to\ComfyUI or set CUSTOMCARD_COMFYUI_ROOT."
}

if (-not (Test-UsablePath $PythonPath)) {
  $ParentRoot = Split-Path -Parent $ComfyRoot
  $Candidates = @(
    (Join-Path $ParentRoot "python_embeded\python.exe"),
    (Join-Path $ParentRoot "python_embedded\python.exe"),
    "python"
  )
  foreach ($Candidate in $Candidates) {
    if ($Candidate -eq "python" -or (Test-UsablePath $Candidate)) {
      $PythonPath = $Candidate
      break
    }
  }
}

$BaseUrl = "http://$HostName`:$Port"
$ReadinessPath = "/" + $ReadinessPath.TrimStart("/")
$ReadinessUrl = "$BaseUrl$ReadinessPath"
$MutexName = "Global\CustomCardComfyUIStartup"
$Mutex = New-Object System.Threading.Mutex($false, $MutexName)
$HasMutex = $false

try {
  $HasMutex = $Mutex.WaitOne([TimeSpan]::FromMinutes(10))
  if (-not $HasMutex) {
    throw "Timed out waiting for ComfyUI startup lock $MutexName."
  }

  try {
    Invoke-RestMethod -Uri $ReadinessUrl -TimeoutSec 5 | Out-Null
    Write-Host "ComfyUI already running at $BaseUrl"
    Write-Host "Set CUSTOMCARD_COMFYUI_URL=$BaseUrl"
    exit 0
  } catch {
    # Continue and start ComfyUI.
  }

  $LogDir = Join-Path $RepoRoot ".codex\tmp"
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
  $StdoutLog = Join-Path $LogDir "comfyui-production-text-$Stamp.out.log"
  $StderrLog = Join-Path $LogDir "comfyui-production-text-$Stamp.err.log"

  $Args = @(
    "-I",
    "-W",
    "ignore::FutureWarning",
    "main.py",
    "--windows-standalone-build",
    "--disable-auto-launch",
    "--listen",
    $HostName,
    "--port",
    [string]$Port
  )

  $ComfyProcess = Start-Process `
    -FilePath $PythonPath `
    -ArgumentList $Args `
    -WorkingDirectory $ComfyRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $StdoutLog `
    -RedirectStandardError $StderrLog `
    -PassThru

  $Deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
  do {
    Start-Sleep -Seconds 2
    if ($ComfyProcess.HasExited) {
      throw "ComfyUI process exited before readiness at $ReadinessUrl with code $($ComfyProcess.ExitCode). Logs: $StdoutLog ; $StderrLog"
    }
    try {
      Invoke-RestMethod -Uri $ReadinessUrl -TimeoutSec 5 | Out-Null
      Write-Host "ComfyUI started at $BaseUrl"
      Write-Host "Set CUSTOMCARD_COMFYUI_URL=$BaseUrl"
      Write-Host "Logs: $StdoutLog ; $StderrLog"
      exit 0
    } catch {
      if ((Get-Date) -ge $Deadline) {
        throw "Timed out waiting for ComfyUI at $ReadinessUrl after $StartupTimeoutSec seconds. Process id: $($ComfyProcess.Id). Logs: $StdoutLog ; $StderrLog"
      }
    }
  } while ($true)
} finally {
  if ($HasMutex) {
    $Mutex.ReleaseMutex() | Out-Null
  }
  $Mutex.Dispose()
}
