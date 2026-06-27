param(
  [string]$ShortcutName = "CustomCard Queue Client",
  [switch]$NoDesktop,
  [switch]$NoStartMenu
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Launcher = Join-Path $RepoRoot "tools\open-provider-queue-dashboard.ps1"

if (-not (Test-Path -LiteralPath $Launcher)) {
  throw "Launcher not found: $Launcher"
}

function New-QueueDashboardShortcut {
  param(
    [string]$ShortcutPath
  )

  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = "powershell.exe"
  $Shortcut.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`""
  $Shortcut.WorkingDirectory = $RepoRoot
  $Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
  $Shortcut.Description = "Open the local CustomCard provider queue dashboard."
  $Shortcut.Save()
}

$Created = @()

if (-not $NoDesktop) {
  $DesktopDir = [Environment]::GetFolderPath("Desktop")
  $DesktopShortcut = Join-Path $DesktopDir "$ShortcutName.lnk"
  New-QueueDashboardShortcut -ShortcutPath $DesktopShortcut
  $Created += $DesktopShortcut
}

if (-not $NoStartMenu) {
  $ProgramsDir = [Environment]::GetFolderPath("Programs")
  $StartMenuDir = Join-Path $ProgramsDir "CustomCard"
  New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null
  $StartMenuShortcut = Join-Path $StartMenuDir "$ShortcutName.lnk"
  New-QueueDashboardShortcut -ShortcutPath $StartMenuShortcut
  $Created += $StartMenuShortcut
}

$Created | ForEach-Object {
  [pscustomobject]@{
    shortcut = $_
    target = $Launcher
  }
}
