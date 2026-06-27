param(
  [string]$Url = "",
  [string]$ComfyUrl = "",
  [int]$Port = 8794,
  [string]$HostName = "127.0.0.1",
  [int]$StartupTimeoutSec = 30
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DashboardUrl = "http://$HostName`:$Port/"
$DashboardLauncher = Join-Path $RepoRoot "tools\start-provider-queue-dashboard.ps1"

function Test-DashboardReady {
  try {
    $Response = Invoke-WebRequest -UseBasicParsing -Uri $DashboardUrl -TimeoutSec 2
    return $Response.StatusCode -eq 200 -and $Response.Content -match "CustomCard Queue Client"
  } catch {
    return $false
  }
}

function Start-DashboardServer {
  $Arguments = @(
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    "`"$DashboardLauncher`"",
    "-HostName",
    "`"$HostName`"",
    "-Port",
    "$Port",
    "-NoBrowser"
  )

  if (-not [string]::IsNullOrWhiteSpace($Url)) {
    $Arguments += @("-Url", "`"$Url`"")
  }

  if (-not [string]::IsNullOrWhiteSpace($ComfyUrl)) {
    $Arguments += @("-ComfyUrl", "`"$ComfyUrl`"")
  }

  Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList ($Arguments -join " ") `
    -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden | Out-Null
}

if (-not (Test-DashboardReady)) {
  Start-DashboardServer
  $Deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
  do {
    Start-Sleep -Milliseconds 500
    if (Test-DashboardReady) {
      break
    }
  } while ((Get-Date) -lt $Deadline)
}

Start-Process $DashboardUrl | Out-Null
Write-Host "CustomCard Queue Client: $DashboardUrl"
