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
$BootLog = Join-Path $PartyDir 'launcher-boot.log'
$CrashLog = Join-Path $PartyDir 'launcher-crash.log'
$AliveFlag = Join-Path $PartyDir 'launcher-alive.flag'
$DefaultPort = 8787
$NoLanMarker = '__NO_LAN__'
$LauncherStamp = 'launcher build 2026-10-04g'

function Ensure-PartyDir {
  if (-not (Test-Path -LiteralPath $PartyDir)) {
    New-Item -ItemType Directory -Path $PartyDir | Out-Null
  }
}

function Write-Boot([string]$msg) {
  try {
    Ensure-PartyDir
    $line = ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss.fff'), $msg)
    Add-Content -LiteralPath $BootLog -Value $line -Encoding UTF8
  } catch {}
}

function Write-Crash($err) {
  try {
    Ensure-PartyDir
    ($err | Out-String) | Set-Content -LiteralPath $CrashLog -Encoding UTF8
  } catch {}
}

function Clear-NativeExitCode {
  $global:LASTEXITCODE = 0
}

function Get-ConfiguredPort {
  if (Test-Path -LiteralPath $PortFile) {
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

$script:CachedLanIps = $null
$script:LanCacheAt = Get-Date '2000-01-01'

function Get-LanIps {
  # Pure .NET - avoid ipconfig/netstat exit-code leakage into powershell.exe
  try {
    if ($script:CachedLanIps -and (((Get-Date) - $script:LanCacheAt).TotalSeconds -lt 45)) {
      return $script:CachedLanIps
    }
  } catch {}
  $ips = New-Object System.Collections.Generic.List[string]
  try {
    foreach ($ni in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
      if ($ni.OperationalStatus -ne 'Up') { continue }
      $props = $ni.GetIPProperties()
      foreach ($uni in $props.UnicastAddresses) {
        if ($uni.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
        $ip = $uni.Address.ToString()
        if ((Test-PrivateIpv4 $ip) -and -not $ips.Contains($ip)) { [void]$ips.Add($ip) }
      }
    }
  } catch {}
  $script:CachedLanIps = @($ips | Sort-Object {
      if ($_ -like '192.168.*') { 0 } elseif ($_ -like '10.*') { 1 } else { 2 }
    }, { $_ })
  $script:LanCacheAt = Get-Date
  return $script:CachedLanIps
}

function Test-PortOpen([int]$port) {
  $client = $null
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(300, $false)
    if (-not $ok) { return $false }
    $client.EndConnect($iar)
    return $true
  } catch {
    return $false
  } finally {
    if ($client) { try { $client.Close() } catch {} }
  }
}

function Get-ServerPid {
  if (Test-Path -LiteralPath $PidFile) {
    $raw = (Get-Content -LiteralPath $PidFile -Encoding UTF8 -Raw).Trim()
    if ($raw -match '^\d+$') {
      $p = Get-Process -Id ([int]$raw) -ErrorAction SilentlyContinue
      if ($p) { return [int]$raw }
    }
  }
  return $null
}

function Test-ServerRunning {
  $serverPid = Get-ServerPid
  if ($null -ne $serverPid) { return $true }
  try {
    $port = Get-ConfiguredPort
    return [bool](Test-PortOpen $port)
  } catch {
    return $false
  }
}

function Get-NodeCmd {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Node.js not found. Install LTS from https://nodejs.org/" }
  return $cmd.Source
}

function Get-NpmCmd {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $cmd) { $cmd = Get-Command npm -ErrorAction SilentlyContinue }
  if (-not $cmd) { throw "npm not found. Install Node.js LTS from https://nodejs.org/" }
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
      $serverPid = Get-ServerPid
      if ($serverPid) { $lines.Add("Status: RUNNING (PID $serverPid)") }
      else { $lines.Add("Status: RUNNING") }
      $lines.Add("Local: http://localhost:$port")
      foreach ($ip in $ips) {
        if ($ip -eq $NoLanMarker) { $lines.Add("LAN IP not detected yet") }
        else {
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
    else { Write-Status "Ready - press Start" 'Gray' }
  } catch {
    try { Write-Status "UI refresh warning: $_" 'Firebrick' } catch {}
  } finally {
    Clear-NativeExitCode
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

  if (-not (Test-Path -LiteralPath (Join-Path $Root 'package.json'))) {
    throw "package.json not found. Put this launcher inside the KTV project."
  }
  if (-not (Test-BuildOutputReady)) {
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
    if (-not (Test-BuildOutputReady)) { return }
  }

  Write-Status 'Starting...' 'DarkOrange'
  $node = Get-NodeCmd
  $errLog = Join-Path $PartyDir 'server.err.log'
  if (Test-Path -LiteralPath $LogFile) { Remove-Item -LiteralPath $LogFile -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $errLog) { Remove-Item -LiteralPath $errLog -Force -ErrorAction SilentlyContinue }

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
    if (Test-PortOpen $port) { $ok = $true; break }
    if ($proc.HasExited) { break }
  }

  if (-not $ok) {
    Write-Status 'Start failed - see .party/server.log' 'Firebrick'
    $msg = "Start failed or timed out." + [Environment]::NewLine + "Check Node.js and log:" + [Environment]::NewLine + $LogFile
    [System.Windows.Forms.MessageBox]::Show($msg, 'KaiChang') | Out-Null
  }
  Clear-NativeExitCode
  Refresh-Ui
}

function Stop-Server {
  Write-Status 'Stopping...' 'DarkOrange'
  $port = Get-ConfiguredPort
  $pids = @()
  $serverPid = Get-ServerPid
  if ($serverPid) { $pids += $serverPid }

  foreach ($id in ($pids | Select-Object -Unique)) {
    try { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } catch {}
  }

  try {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine -like '*server/index.js*' -and $_.CommandLine -like "*$Root*" } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch {}

  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 400
  Clear-NativeExitCode
  Refresh-Ui
}

function Invoke-NpmStep([string]$StepName, [string]$NpmArgs, [string]$LogFilePath) {
  Ensure-PartyDir
  $exitFile = "$LogFilePath.exit"
  foreach ($p in @($LogFilePath, $exitFile)) {
    if (Test-Path -LiteralPath $p) {
      Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
    }
  }

  $stepBat = Join-Path $PartyDir ("npm-" + $StepName + ".cmd")
  $lines = @(
    '@echo off',
    'setlocal EnableDelayedExpansion',
    "cd /d `"$Root`"",
    "call npm $NpmArgs > `"$LogFilePath`" 2>&1",
    'set EC=!ERRORLEVEL!',
    "echo !EC!> `"$exitFile`"",
    'endlocal',
    'exit /b 0'
  )
  Set-Content -LiteralPath $stepBat -Value $lines -Encoding ASCII
  Write-Status "Running npm $StepName (see .party)..." 'DarkOrange'

  $null = Start-Process -FilePath $env:ComSpec `
    -ArgumentList @('/d', '/c', "`"$stepBat`"") `
    -WorkingDirectory $Root `
    -Wait -PassThru -WindowStyle Hidden

  $code = 0
  if (Test-Path -LiteralPath $exitFile) {
    $raw = (Get-Content -LiteralPath $exitFile -Encoding ASCII -Raw).Trim()
    if ($raw -match '^\d+$') { $code = [int]$raw }
  }

  Remove-Item -LiteralPath $stepBat -Force -ErrorAction SilentlyContinue
  Clear-NativeExitCode
  return ,[int]$code
}

function Test-BuildOutputReady {
  return (Test-Path -LiteralPath (Join-Path $Root 'dist\player.html'))
}

function Invoke-Prepare {
  Write-Status 'Installing/building (first time may take minutes)...' 'DarkOrange'
  try { $null = Get-NpmCmd } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
    return
  }
  Ensure-PartyDir
  $installLog = Join-Path $PartyDir 'npm-install.log'
  $buildLog = Join-Path $PartyDir 'npm-build.log'
  $prepareLog = Join-Path $PartyDir 'prepare.log'
  $form.Enabled = $false
  $ok = $false
  $errorText = $null
  try {
    $installCode = [int](Invoke-NpmStep 'install' 'install --no-fund --no-audit' $installLog)
    $hasModules = Test-Path -LiteralPath (Join-Path $Root 'node_modules')
    "install exit=$installCode modules=$hasModules" | Set-Content -LiteralPath $prepareLog -Encoding UTF8
    if (-not $hasModules) {
      $errorText = "npm install did not create node_modules (exit $installCode). See .party/npm-install.log"
    } else {
      $buildCode = [int](Invoke-NpmStep 'build' 'run build' $buildLog)
      $ready = Test-BuildOutputReady
      "build exit=$buildCode distReady=$ready" | Add-Content -LiteralPath $prepareLog -Encoding UTF8
      if ($ready) { $ok = $true }
      else { $errorText = "Build did not produce dist\player.html (exit $buildCode). See .party/npm-build.log" }
    }
  } catch {
    $errorText = "$_"
    try { $_ | Out-String | Add-Content -LiteralPath $prepareLog -Encoding UTF8 } catch {}
  } finally {
    Clear-NativeExitCode
    $form.Enabled = $true
    Refresh-Ui
  }

  if ($ok) {
    Write-Status 'Build complete - press Start Party' 'DarkGreen'
    [System.Windows.Forms.MessageBox]::Show('Build complete. Press Start Party next.', 'KaiChang') | Out-Null
  } elseif ($errorText) {
    Write-Status 'Setup failed - see .party logs' 'Firebrick'
    [System.Windows.Forms.MessageBox]::Show($errorText, 'KaiChang') | Out-Null
  }
  Clear-NativeExitCode
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

function Open-YouTubeLogin {
  Start-Process 'https://www.youtube.com/'
  $msg = @"
Open YouTube in Chrome or Edge and sign in.

Then return here and press Start Party.
Video download uses your browser login cookies
when YouTube asks "confirm you are not a bot".
"@
  [System.Windows.Forms.MessageBox]::Show($msg, 'KaiChang') | Out-Null
}

function Get-StartupShortcutPath {
  $startup = [Environment]::GetFolderPath('Startup')
  return (Join-Path $startup 'KaiChang-Party-Control.lnk')
}

function Install-Startup {
  $target = Join-Path $Root 'start-kaichang.bat'
  if (-not (Test-Path -LiteralPath $target)) {
    $candidates = Get-ChildItem -LiteralPath $Root -Filter '*.bat' -File | Select-Object -ExpandProperty FullName
    $target = $candidates | Select-Object -First 1
  }
  if (-not $target -or -not (Test-Path -LiteralPath $target)) { throw "Launcher bat not found in $Root" }
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
  if (Test-Path -LiteralPath $lnkPath) {
    Remove-Item -LiteralPath $lnkPath -Force
    [System.Windows.Forms.MessageBox]::Show('Startup shortcut removed.', 'KaiChang') | Out-Null
  } else {
    [System.Windows.Forms.MessageBox]::Show('No startup shortcut found.', 'KaiChang') | Out-Null
  }
}

# ---- boot ----
Ensure-PartyDir
Remove-Item -LiteralPath $CrashLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $AliveFlag -Force -ErrorAction SilentlyContinue
Set-Content -LiteralPath $BootLog -Value ("boot " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -Encoding UTF8
Write-Boot "root=$Root"
Write-Boot "stamp=$LauncherStamp"
Clear-NativeExitCode

try {
  Write-Boot 'creating form'
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'KaiChang Party Control'
  $form.Size = New-Object System.Drawing.Size(580, 540)
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

  $lblTitle = New-Object System.Windows.Forms.Label
  $lblTitle.Text = 'PC server control (tablet/phone use browser only)'
  $lblTitle.Location = New-Object System.Drawing.Point(20, 16)
  $lblTitle.Size = New-Object System.Drawing.Size(360, 28)
  $lblTitle.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
  $form.Controls.Add($lblTitle)

  $lblVer = New-Object System.Windows.Forms.Label
  $lblVer.Text = $LauncherStamp
  $lblVer.Location = New-Object System.Drawing.Point(390, 20)
  $lblVer.Size = New-Object System.Drawing.Size(150, 22)
  $lblVer.ForeColor = [System.Drawing.Color]::Gray
  $lblVer.TextAlign = [System.Drawing.ContentAlignment]::TopRight
  $form.Controls.Add($lblVer)

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
  try {
    $configured = Get-ConfiguredPort
    if ($configured -lt [int]$numPort.Minimum) { $configured = [int]$numPort.Minimum }
    if ($configured -gt [int]$numPort.Maximum) { $configured = [int]$numPort.Maximum }
    $numPort.Value = $configured
  } catch {
    $numPort.Value = 8787
    Write-Boot ("port-default-fallback: " + $_)
  }
  $form.Controls.Add($numPort)

  $btnStart = New-Object System.Windows.Forms.Button
  $btnStart.Text = 'Start Party'
  $btnStart.Location = New-Object System.Drawing.Point(180, 76)
  $btnStart.Size = New-Object System.Drawing.Size(110, 34)
  $btnStart.Add_Click({
    try { Start-Server } catch {
      [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
      Refresh-Ui
    } finally { Clear-NativeExitCode }
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
    } finally { Clear-NativeExitCode }
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
      try { Write-Crash $_ } catch {}
      [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
      Refresh-Ui
    } finally { Clear-NativeExitCode }
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

  $btnYt = New-Object System.Windows.Forms.Button
  $btnYt.Text = 'Open YouTube login'
  $btnYt.Location = New-Object System.Drawing.Point(400, 404)
  $btnYt.Size = New-Object System.Drawing.Size(140, 30)
  $btnYt.Add_Click({
    try { Open-YouTubeLogin } catch {
      [System.Windows.Forms.MessageBox]::Show("$_", 'KaiChang') | Out-Null
    }
  })
  $form.Controls.Add($btnYt)

  $timer = New-Object System.Windows.Forms.Timer
  $timer.Interval = 5000
  $timer.Add_Tick({
    try { Refresh-Ui } catch { Write-Boot ("timer: " + $_) } finally { Clear-NativeExitCode }
  })

  $form.Add_Shown({
    try {
      Write-Boot 'shown'
      Refresh-Ui
      $timer.Start()
    } catch {
      Write-Crash $_
    } finally {
      Clear-NativeExitCode
    }
  })
  $form.Add_FormClosed({
    try { $timer.Stop() } catch {}
    Write-Boot 'closed'
    Clear-NativeExitCode
    [Environment]::Exit(0)
  })

  Write-Boot 'app-run'
  Set-Content -LiteralPath $AliveFlag -Value '1' -Encoding ASCII
  Clear-NativeExitCode
  [System.Windows.Forms.Application]::Run($form)
  Write-Boot 'app-run-returned'
  Clear-NativeExitCode
  [Environment]::Exit(0)
} catch {
  Write-Boot ("fatal: " + $_)
  Write-Crash $_
  try {
    [System.Windows.Forms.MessageBox]::Show(
      "Launcher error:`n$_`n`nSee .party/launcher-crash.log",
      'KaiChang'
    ) | Out-Null
  } catch {}
  Clear-NativeExitCode
  [Environment]::Exit(1)
}
