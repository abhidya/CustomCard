param(
  [string]$ComfyRoot = $env:CUSTOMCARD_COMFYUI_ROOT,
  [string]$PythonPath = "",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8188,
  [int]$StartupTimeoutSec = 600,
  [string]$ReadinessPath = "/system_stats",
  [string]$CudaDevices = $env:CUSTOMCARD_COMFYUI_CUDA_DEVICES,
  [string]$DefaultDevice = $env:CUSTOMCARD_COMFYUI_DEFAULT_DEVICE,
  [string]$PreviewMethod = $env:CUSTOMCARD_COMFYUI_PREVIEW_METHOD,
  [string]$CacheMode = $env:CUSTOMCARD_COMFYUI_CACHE_MODE,
  [double]$ReserveVramGb = 0,
  [int]$ExpectedGpuCount = 0,
  [string]$FrontEndRoot = $env:CUSTOMCARD_COMFYUI_FRONT_END_ROOT,
  [string[]]$WhitelistCustomNodes = @(),
  [switch]$DisableAllCustomNodes,
  [switch]$DisableApiNodes,
  [switch]$MmapTorchFiles,
  [switch]$Fast
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-UsablePath {
  param([string]$Path)
  return -not [string]::IsNullOrWhiteSpace($Path) -and (Test-Path -LiteralPath $Path)
}

function Test-UsableConfigValue {
  param([string]$Value)
  $Normalized = [string]$Value
  if ([string]::IsNullOrWhiteSpace($Normalized)) {
    return $false
  }
  return -not @("false", "no", "off", "disabled", "example", "replace-me").Contains($Normalized.Trim().ToLowerInvariant())
}

function Test-TruthyEnv {
  param([string]$Value)
  if (-not (Test-UsableConfigValue $Value)) {
    return $false
  }
  return @("1", "true", "yes", "on", "enabled").Contains($Value.Trim().ToLowerInvariant())
}

function Split-ConfigList {
  param([string]$Value)
  if (-not (Test-UsableConfigValue $Value)) {
    return @()
  }
  return $Value -split "[,;]" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
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
$DisableAllCustomNodesValue = $DisableAllCustomNodes.IsPresent -or (Test-TruthyEnv $env:CUSTOMCARD_COMFYUI_DISABLE_ALL_CUSTOM_NODES)
$DisableApiNodesValue = $DisableApiNodes.IsPresent -or (Test-TruthyEnv $env:CUSTOMCARD_COMFYUI_DISABLE_API_NODES)
$MmapTorchFilesValue = $MmapTorchFiles.IsPresent -or (Test-TruthyEnv $env:CUSTOMCARD_COMFYUI_MMAP_TORCH_FILES)
$FastValue = $Fast.IsPresent -or (Test-TruthyEnv $env:CUSTOMCARD_COMFYUI_FAST)

if ($ReserveVramGb -le 0 -and (Test-UsableConfigValue $env:CUSTOMCARD_COMFYUI_RESERVE_VRAM_GB)) {
  $ReserveVramGb = [double]$env:CUSTOMCARD_COMFYUI_RESERVE_VRAM_GB
}

if ($ExpectedGpuCount -le 0 -and (Test-UsableConfigValue $env:CUSTOMCARD_COMFYUI_EXPECTED_GPU_COUNT)) {
  $ExpectedGpuCount = [int]$env:CUSTOMCARD_COMFYUI_EXPECTED_GPU_COUNT
}

if ($WhitelistCustomNodes.Count -eq 0) {
  $WhitelistCustomNodes = @(Split-ConfigList $env:CUSTOMCARD_COMFYUI_WHITELIST_CUSTOM_NODES)
}

function Read-ComfyStats {
  $Stats = Invoke-RestMethod -Uri $ReadinessUrl -TimeoutSec 5
  if ($ExpectedGpuCount -gt 0) {
    $DeviceCount = @($Stats.devices).Count
    if ($DeviceCount -lt $ExpectedGpuCount) {
      throw "ComfyUI reachable at $ReadinessUrl but reported $DeviceCount GPU device(s); expected at least $ExpectedGpuCount. Check -CudaDevices/CUSTOMCARD_COMFYUI_CUDA_DEVICES and the ComfyUI process."
    }
  }
  return $Stats
}

function Add-ComfyArg {
  param(
    [ref]$ArgsRef,
    [string]$Name,
    [string]$Value
  )
  if (Test-UsableConfigValue $Value) {
    $ArgsRef.Value += @($Name, $Value)
  }
}

function Add-CacheArgs {
  param([ref]$ArgsRef)
  if (-not (Test-UsableConfigValue $CacheMode)) {
    return
  }
  $Normalized = $CacheMode.Trim().ToLowerInvariant()
  if ($Normalized -eq "classic") {
    $ArgsRef.Value += "--cache-classic"
    return
  }
  if ($Normalized -eq "none") {
    $ArgsRef.Value += "--cache-none"
    return
  }
  if ($Normalized -match "^lru:(\d+)$") {
    $ArgsRef.Value += @("--cache-lru", $Matches[1])
    return
  }
  if ($Normalized -match "^ram(?::(.+))?$") {
    $ArgsRef.Value += "--cache-ram"
    if ($Matches[1]) {
      $ArgsRef.Value += @($Matches[1] -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    }
    return
  }
  throw "Unsupported CacheMode '$CacheMode'. Use classic, none, lru:<count>, ram, or ram:<activeGb>[,<inactiveGb>]."
}

try {
  $HasMutex = $Mutex.WaitOne([TimeSpan]::FromMinutes(10))
  if (-not $HasMutex) {
    throw "Timed out waiting for ComfyUI startup lock $MutexName."
  }

  try {
    Read-ComfyStats | Out-Null
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

  Add-ComfyArg ([ref]$Args) "--cuda-device" $CudaDevices
  Add-ComfyArg ([ref]$Args) "--default-device" $DefaultDevice
  Add-ComfyArg ([ref]$Args) "--preview-method" $PreviewMethod
  Add-ComfyArg ([ref]$Args) "--front-end-root" $FrontEndRoot
  Add-CacheArgs ([ref]$Args)
  if ($ReserveVramGb -gt 0) {
    $Args += @("--reserve-vram", [string]$ReserveVramGb)
  }
  if ($DisableAllCustomNodesValue) {
    $Args += "--disable-all-custom-nodes"
    if ($WhitelistCustomNodes.Count -gt 0) {
      $Args += "--whitelist-custom-nodes"
      $Args += $WhitelistCustomNodes
    }
  }
  if ($DisableApiNodesValue) {
    $Args += "--disable-api-nodes"
  }
  if ($MmapTorchFilesValue) {
    $Args += "--mmap-torch-files"
  }
  if ($FastValue) {
    $Args += "--fast"
  }

  $StartupStartedAt = Get-Date
  "ComfyUI command: $PythonPath $($Args -join ' ')" | Out-File -LiteralPath $StdoutLog -Append -Encoding utf8

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
      $Stats = Read-ComfyStats
      $StartupSeconds = [Math]::Round(((Get-Date) - $StartupStartedAt).TotalSeconds, 1)
      $DeviceCount = @($Stats.devices).Count
      "ComfyUI startup duration seconds: $StartupSeconds; reported devices: $DeviceCount" | Out-File -LiteralPath $StdoutLog -Append -Encoding utf8
      Write-Host "ComfyUI started at $BaseUrl"
      Write-Host "Set CUSTOMCARD_COMFYUI_URL=$BaseUrl"
      Write-Host "Startup seconds: $StartupSeconds; GPU devices: $DeviceCount"
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
