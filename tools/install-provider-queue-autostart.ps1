param(
  [string]$Url = "https://customcard-three.vercel.app",
  [string]$TaskName = "CustomCard ComfyUI Queue Worker",
  [string]$TaskPath = "\CustomCard\",
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Launcher = Join-Path $RepoRoot "tools\start-provider-queue-worker.ps1"
$UserId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path -LiteralPath $Launcher)) {
  throw "Launcher not found: $Launcher"
}

$ActionArgs = @(
  "-NoLogo",
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-WindowStyle",
  "Hidden",
  "-File",
  "`"$Launcher`"",
  "-Url",
  "`"$Url`""
) -join " "

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument $ActionArgs `
  -WorkingDirectory $RepoRoot

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $UserId
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -MultipleInstances IgnoreNew `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable

$Principal = New-ScheduledTaskPrincipal `
  -UserId $UserId `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -TaskPath $TaskPath `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Description "Starts the CustomCard prod provider queue worker backed by local ComfyUI." `
  -Force | Out-Null

if ($StartNow) {
  Start-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
}

Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath | Select-Object TaskPath, TaskName, State
