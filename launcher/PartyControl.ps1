# KaiChang Party Control (Windows)
# Save as UTF-8 with BOM. Starts/stops the local server only.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PartyDir = Join-Path $Root '.party'
$PidFile = Join-Path $PartyDir 'server.pid'
$LogFile = Join-Path $PartyDir 'server.log'
$PortFile = Join-Path $PartyDir 'port.txt'
$DefaultPort = 8787
$NoLanMarker = '__NO_LAN__'

function Ensure-PartyDir {
  if (-not (Test-Path $PartyDir)) {
    New-Item -ItemType Directory -Path $PartyDir | Out-Null
  }
}

function Get-ConfiguredPort {
  if (Test-Path $PortFile) {
    $raw = (Get-Content -LiteralPath $PortFile -Encoding UTF8 -Raw).Trim()
    if ($raw -match '^\d+$') { return [int]$raw }
  }
  return $DefaultPort
}

function Save-Port([int]$port) {
  Ensure-PartyDir
  Set-Content -LiteralPath $PortFile -Value $port -Encoding UTF8
}

function Test-PrivateIpv4([string]$ip) {
  if ($ip -like '192.168.*') { return $true }
  if ($ip -like '10.*') { return $true }
  if ($ip -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.') { return $true }
  return $false
}

function Get-LanIps {
  $ips = @()
  try {
    $ips = @(
      Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.IPAddress -notlike '127.*' -and (Test-PrivateIpv4 $_.IPAddress) } |
        Select-Object -ExpandProperty IPAddress -Unique
    )
  } catch {
    $ips = @()
  }
  if ($ips.Count -eq 0) {
    $text = ipconfig 2>$null | Out-String
    [regex]::Matches($text, '(\d+\.\d+\.\d+\.\d+)') | ForEach-Object {
      $ip = $_.Groups[1].Value
      if ((Test-PrivateIpv4 $ip) -and ($ips -notcontains $ip)) { $ips += $ip }
    }
  }
  return @($ips | Sort-Object {
      if ($_ -like '192.168.*') { 0 } elseif ($_ -like '10.*') { 1 } else { 2 }
    }, { $_ })
}

function Get-ListeningPid([int]$port) {
  try {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
      Select-Object -First 1
    if ($conn) { return [int]$conn.OwningProcess }
  } catch {}
  try {
    $line = netstat -ano | Select-String -Pattern ":$port\s+.*LISTENING\s+(\d+)" | Select-Object -First 1
    if ($line -and $line.Matches.Groups.Count -ge 2) {
      return [int]$line.Matches.Groups[1].Value
    }
  } catch {}
  return $null
}

function Get-ServerPid {
  $port = Get-ConfiguredPort
  $listenPid = Get-ListeningPid $port
  if ($listenPid) { return $listenPid }
  if (Test-Path $PidFile) {
    $raw = (Get-Content -LiteralPath $PidFile -Encoding UTF8 -Raw).Trim()
    if ($raw -match '^\d+$') {
      $p = Get-Process -Id ([int]$raw) -ErrorAction SilentlyContinue
      if ($p) { return [int]$raw }
    }
  }
  return $null
}

function Test-ServerRunning {
  return $null -ne (Get-ServerPid)
}

function Get-NodeCmd {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Node.js not found. Install LTS from https://nodejs.org/"
  }
  return $cmd.Source
}

function Get-NpmCmd {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $cmd) { $cmd = Get-Command npm -ErrorAction SilentlyContinue }
  if (-not $cmd) {
    throw "npm not found. Install Node.js LTS from https://nodejs.org/"
  }
  return $cmd.Source
}

function Write-Status($text, $color = 'Black') {
  try {
    $lblStatus.Text = $text
    $lblStatus.ForeColor = [System.Drawing.Color]::FromName($color)
    $lblStatus.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
  } catch {}
}

function Refresh-Ui {
  try {
    $port = Get-ConfiguredPort
    $running = Test-ServerRunning
    $ips = @(Get-LanIps)
    if ($ips.Count -eq 0) { $ips = @($NoLanMarker) }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("Project: $Root")
    $lines.Add("Port: $port")
    if ($running) {
      $lines.Add("Status: RUNNING (PID $(Get-ServerPid))")
      $lines.Add("Local: http://localhost:$port")
      foreach ($ip in $ips) {
        if ($ip -eq $NoLanMarker) {
          $lines.Add("LAN IP not detected yet")
        } else {
          $lines.Add("Tablet player: http://${ip}:$port/player.html")
          $lines.Add("Phone remote:  http://${ip}:$port/remote.html")
        }
      }
    } else {
      $lines.Add("Status: STOPPED")
      $lines.Add("Press Start, then open the URL on tablet/phone:")
      foreach ($ip in $ips) {
        if ($ip -eq $NoLanMarker) { $lines.Add("LAN IP not detected yet") }
        else { $lines.Add("http://${ip}:$port") }
      }
    }
    $txtInfo.Text = ($lines -join [Environment]::NewLine)

    $btnStart.Enabled = -not $running
    $btnStop.Enabled = $running
    $btnOpenPlayer.Enabled = $running
    $lanCount = @($ips | Where-Object { $_ -ne $NoLanMarker }).Count
    $btnCopy.Enabled = $running -and ($lanCount -gt 0)

    if ($running) { Write-Status "Party RUNNING" 'DarkGreen' }
    else { Write-Status "Ready - press Start" 'DimGray' }
  } catch {
    try { Write-Status "UI refresh warning: $_" 'Firebrick' } catch {}
  }
}

function Start-Server {
  Ensure-PartyDir
  if (Test-ServerRunning) {
    [System.Windows.Forms.MessageBox]::Show('Server is already running.', 'KaiChang') | Out-Null
    Refresh-Ui
    return
  }

  $port = [int]$numPort.Value
  Save-Port $port

  if (-not (Test-Path (Join-Path $Root 'package.json'))) {
    throw "package.json not found. Put this launcher inside the KTV project."
  }
  if (-not (Test-Path (Join-Path $Root 'dist\player.html'))) {
    $answer = [System.Windows.Forms.MessageBox]::Show(
      "Frontend not built yet (missing dist). Run npm install + npm run build now?",
      'KaiChang',
      [System.Windows.Forms.MessageBoxButtons]::YesNo
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
      Invoke-Prepare
    } else {
      return
    }
  }

  Write-Status 'Starting...' 'DarkOrange'
  $node = Get-NodeCmd
  $errLog = Join-Path $PartyDir 'server.err.log'
  if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }
  if (Test-Path $errLog) { Remove-Item $errLog -Force -ErrorAction SilentlyContinue }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $node
  $psi.Arguments = 'server/index.js'
  $psi.WorkingDirectory = $Root
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.EnvironmentVariables['NODE_ENV'] = 'production'
  $psi.EnvironmentVariables['PORT'] = "$port"

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  $outHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $e)
    if ($e.Data) { Add-Content -LiteralPath $LogFile -Value $e.Data -Encoding UTF8 }
  }
  $errHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $e)
    if ($e.Data) { Add-Content -LiteralPath $errLog -Value $e.Data -Encoding UTF8 }
  }
  $proc.add_OutputDataReceived($outHandler)
  $proc.add_ErrorDataReceived($errHandler)
  $null = $proc.Start()
  $proc.BeginOutputReadLine()
  $proc.BeginErrorReadLine()
  Set-Content -LiteralPath $PidFile -Value $proc.Id -Encoding UTF8

  $ok = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    if (Get-ListeningPid $port) { $ok = $true; break }
    if ($proc.HasExited) { break }
  }

  if (-not $ok) {
    Write-Status 'Start failed - see .party/server.log' 'Firebrick'
    $msg = "Start failed or timed out." + [Environment]::NewLine + "Check Node.js and log:" + [Environment]::NewLine + $LogFile
    [System.Windows.Forms.MessageBox]::Show($msg, 'KaiChang') | Out-Null
  }
  Refresh-Ui
}

function Stop-Server {
  Write-Status 'Stopping...' 'DarkOrange'
  $port = Get-ConfiguredPort
  $pids = @()
  if (Test-Path $PidFile) {
    $raw = (Get-Content -LiteralPath $PidFile -Encoding UTF8 -Raw).Trim()
    if ($raw -match '^\d+$') { $pids += [int]$raw }
  }
  $listenPid = Get-ListeningPid $port
  if ($listenPid) { $pids += $listenPid }
  $pids = $pids | Select-Object -Unique

  foreach ($id in $pids) {
    try { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } catch {}
  }

  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like '*server/index.js*' -and $_.CommandLine -like "*$Root*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 400
  Refresh-Ui
}

function Invoke-Prepare {
  Write-Status 'Installing/building (first time may take minutes)...' 'DarkOrange'
  $npm = Get-NpmCmd
  Ensure-PartyDir
  $installLog = Join-Path $PartyDir 'npm-install.log'
  $buildLog = Join-Path $PartyDir 'npm-build.log'
  $form.Enabled = $false
  try {
    # Hidden window: -NoNewWindow can kill this PowerShell host when npm exits.
    if (Test-Path $installLog) { Remove-Item -LiteralPath $installLog -Force -ErrorAction SilentlyContinue }
    if (Test-Path $buildLog) { Remove-Item -LiteralPath $buildLog -Force -ErrorAction SilentlyContinue }

    $install = Start-Process -FilePath $npm `
      -ArgumentList @('install','--no-fund','--no-audit') `
      -WorkingDirectory $Root `
      -Wait -PassThru -WindowStyle Hidden `
      -RedirectStandardOutput $installLog `
      -RedirectStandardError $installLog
    if ($install.ExitCode -ne 0) {
      throw "npm install failed (exit $($install.ExitCode)). See .party/npm-install.log"
    }

    $build = Start-Process -FilePath $npm `
      -ArgumentList @('run','build') `
      -WorkingDirectory $Root `
      -Wait -PassThru -WindowStyle Hidden `
      -RedirectStandardOutput $buildLog `
      -RedirectStandardError $buildLog
    if ($build.ExitCode -ne 0) {
      throw "npm run build failed (exit $($build.ExitCode)). See .party/npm-build.log"
    }

    [System.Windows.Forms.MessageBox]::Show('Build complete. You can press Start Party.', 'KaiChang') | Out-Null
  } finally {
    $form.Enabled = $true
    Refresh-Ui
  }
}

function Get-PrimaryLanUrl {
  $port = Get-ConfiguredPort
  $ip = @(Get-LanIps) | Select-Object -First 1
  if (-not $ip) { return "http://localhost:$port/player.html" }
  return "http://${ip}:$port/player.html"
}

function Copy-LanUrl {
  $url = Get-PrimaryLanUrl
  [System.Windows.Forms.Clipboard]::SetText($url)
  Write-Status "Copied: $url" 'DarkGreen'
}

function Open-Player {
  Start-Process (Get-PrimaryLanUrl)
}

function Get-StartupShortcutPath {
  $startup = [Environment]::GetFolderPath('Startup')
  return (Join-Path $startup 'KaiChang-Party-Control.lnk')
}

function Install-Startup {
  $target = Join-Path $Root 'start-kaichang.bat'
  if (-not (Test-Path $target)) {
    $candidates = Get-ChildItem -LiteralPath $Root -Filter '*.bat' -File | Select-Object -ExpandProperty FullName
    $target = $candidates | Select-Object -First 1
  }
  if (-not $target -or -not (Test-Path $target)) { throw "Launcher bat not found in $Root" }
  $lnkPath = Get-StartupShortcutPath
  $w = New-Object -ComObject WScript.Shell
  $sc = $w.CreateShortcut($lnkPath)
  $sc.TargetPath = $target
  $sc.WorkingDirectory = $Root
  $sc.WindowStyle = 7
  $sc.Description = 'KaiChang party control'
  $sc.Save()
  $msg = "Startup shortcut added:" + [Environment]::NewLine + $lnkPath + [Environment]::NewLine + [Environment]::NewLine + "Opens control panel on boot (does not auto-start party)."
  [System.Windows.Forms.MessageBox]::Show($msg, 'KaiChang') | Out-Null
}

function Remove-Startup {
  $lnkPath = Get-StartupShortcutPath
  if (Test-Path $lnkPath) {
    Remove-Item -LiteralPath $lnkPath -Force
    [System.Windows.Forms.MessageBox]::Show('Startup shortcut removed.', 'KaiChang') | Out-Null
  } else {
    [System.Windows.Forms.MessageBox]::Show('No startup shortcut found.', 'KaiChang') | Out-Null
  }
}

# ---- UI ----
$form = New-Object System.Windows.Forms.Form
$form.Text = 'KaiChang Party Control'
$form.Size = New-Object System.Drawing.Size(580, 500)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = 'PC server control (tablet/phone use browser only)'
$lblTitle.Location = New-Object System.Drawing.Point(20, 16)
$lblTitle.Size = New-Object System.Drawing.Size(520, 28)
$lblTitle.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblTitle)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(20, 48)
$lblStatus.Size = New-Object System.Drawing.Size(520, 24)
$form.Controls.Add($lblStatus)

$lblPort = New-Object System.Windows.Forms.Label
$lblPort.Text = 'Port'
$lblPort.Location = New-Object System.Drawing.Point(20, 84)
$lblPort.Size = New-Object System.Drawing.Size(48, 24)
$form.Controls.Add($lblPort)

$numPort = New-Object System.Windows.Forms.NumericUpDown
$numPort.Location = New-Object System.Drawing.Point(70, 80)
$numPort.Size = New-Object System.Drawing.Size(90, 28)
$numPort.Minimum = 1024
$numPort.Maximum = 65535
$numPort.Value = Get-ConfiguredPort
$form.Controls.Add($numPort)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = 'Start Party'
$btnStart.Location = New-Object System.Drawing.Point(180, 76)
$btnStart.Size = New-Object System.Drawing.Size(110, 34)
$btnStart.Add_Click({
  try { Start-Server } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
    Refresh-Ui
  }
})
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = 'Stop Party'
$btnStop.Location = New-Object System.Drawing.Point(300, 76)
$btnStop.Size = New-Object System.Drawing.Size(110, 34)
$btnStop.Add_Click({
  try { Stop-Server } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
    Refresh-Ui
  }
})
$form.Controls.Add($btnStop)

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = 'Refresh'
$btnRefresh.Location = New-Object System.Drawing.Point(420, 76)
$btnRefresh.Size = New-Object System.Drawing.Size(100, 34)
$btnRefresh.Add_Click({ Refresh-Ui })
$form.Controls.Add($btnRefresh)

$txtInfo = New-Object System.Windows.Forms.TextBox
$txtInfo.Multiline = $true
$txtInfo.ReadOnly = $true
$txtInfo.ScrollBars = 'Vertical'
$txtInfo.Location = New-Object System.Drawing.Point(20, 126)
$txtInfo.Size = New-Object System.Drawing.Size(520, 220)
$txtInfo.Font = New-Object System.Drawing.Font('Consolas', 10)
$form.Controls.Add($txtInfo)

$btnPrepare = New-Object System.Windows.Forms.Button
$btnPrepare.Text = 'First-time setup (install + build)'
$btnPrepare.Location = New-Object System.Drawing.Point(20, 360)
$btnPrepare.Size = New-Object System.Drawing.Size(250, 34)
$btnPrepare.Add_Click({
  try { Invoke-Prepare } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
    Refresh-Ui
  }
})
$form.Controls.Add($btnPrepare)

$btnOpenPlayer = New-Object System.Windows.Forms.Button
$btnOpenPlayer.Text = 'Open player'
$btnOpenPlayer.Location = New-Object System.Drawing.Point(280, 360)
$btnOpenPlayer.Size = New-Object System.Drawing.Size(120, 34)
$btnOpenPlayer.Add_Click({ Open-Player })
$form.Controls.Add($btnOpenPlayer)

$btnCopy = New-Object System.Windows.Forms.Button
$btnCopy.Text = 'Copy tablet URL'
$btnCopy.Location = New-Object System.Drawing.Point(410, 360)
$btnCopy.Size = New-Object System.Drawing.Size(130, 34)
$btnCopy.Add_Click({ Copy-LanUrl })
$form.Controls.Add($btnCopy)

$btnStartup = New-Object System.Windows.Forms.Button
$btnStartup.Text = 'Add to Windows Startup'
$btnStartup.Location = New-Object System.Drawing.Point(20, 404)
$btnStartup.Size = New-Object System.Drawing.Size(220, 30)
$btnStartup.Add_Click({
  try { Install-Startup } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
  }
})
$form.Controls.Add($btnStartup)

$btnUnstartup = New-Object System.Windows.Forms.Button
$btnUnstartup.Text = 'Remove Startup'
$btnUnstartup.Location = New-Object System.Drawing.Point(250, 404)
$btnUnstartup.Size = New-Object System.Drawing.Size(140, 30)
$btnUnstartup.Add_Click({ Remove-Startup })
$form.Controls.Add($btnUnstartup)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({ Refresh-Ui })
$timer.Start()

$form.Add_Shown({ Refresh-Ui })
$form.Add_FormClosed({ $timer.Stop() })

try {
  [void]$form.ShowDialog()
  exit 0
} catch {
  Ensure-PartyDir
  $crashLog = Join-Path $PartyDir 'launcher-crash.log'
  $_ | Out-String | Set-Content -LiteralPath $crashLog -Encoding UTF8
  [System.Windows.Forms.MessageBox]::Show("Launcher error:`n$_`n`nSee .party/launcher-crash.log", 'KaiChang') | Out-Null
  exit 1
}
