# 開唱｜私人派對控制台（Windows）
# 只負責在電腦上啟動／關閉伺服器；平板與手機仍用瀏覽器。

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PartyDir = Join-Path $Root '.party'
$PidFile = Join-Path $PartyDir 'server.pid'
$LogFile = Join-Path $PartyDir 'server.log'
$PortFile = Join-Path $PartyDir 'port.txt'
$DefaultPort = 8787

function Ensure-PartyDir {
  if (-not (Test-Path $PartyDir)) {
    New-Item -ItemType Directory -Path $PartyDir | Out-Null
  }
}

function Get-ConfiguredPort {
  if (Test-Path $PortFile) {
    $raw = (Get-Content $PortFile -Raw).Trim()
    if ($raw -match '^\d+$') { return [int]$raw }
  }
  return $DefaultPort
}

function Save-Port([int]$port) {
  Ensure-PartyDir
  Set-Content -Path $PortFile -Value $port -Encoding UTF8
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
    # Fallback: parse ipconfig
    $text = ipconfig 2>$null | Out-String
    [regex]::Matches($text, 'IPv4[\w\s\.\u4e00-\u9fff]*?:\s*(\d+\.\d+\.\d+\.\d+)') | ForEach-Object {
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
    $raw = (Get-Content $PidFile -Raw).Trim()
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
    throw "找不到 node。請先安裝 Node.js LTS：https://nodejs.org/"
  }
  return $cmd.Source
}

function Get-NpmCmd {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $cmd) { $cmd = Get-Command npm -ErrorAction SilentlyContinue }
  if (-not $cmd) {
    throw "找不到 npm。請先安裝 Node.js LTS：https://nodejs.org/"
  }
  return $cmd.Source
}

function Write-Status($text, $color = 'Black') {
  $lblStatus.Text = $text
  $lblStatus.ForeColor = [System.Drawing.Color]::$color
  $lblStatus.Refresh()
  [System.Windows.Forms.Application]::DoEvents()
}

function Refresh-Ui {
  $port = Get-ConfiguredPort
  $running = Test-ServerRunning
  $ips = @(Get-LanIps)
  if ($ips.Count -eq 0) { $ips = @('（尚未偵測到區網 IP）') }

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("專案： $Root")
  $lines.Add("埠號： $port")
  if ($running) {
    $lines.Add("狀態： 運作中（PID $(Get-ServerPid)）")
    $lines.Add("本機： http://localhost:$port")
    foreach ($ip in $ips) {
      if ($ip -like '（*') { $lines.Add($ip) }
      else {
        $lines.Add("平板播放： http://${ip}:$port/player.html")
        $lines.Add("手機點歌： http://${ip}:$port/remote.html")
      }
    }
  } else {
    $lines.Add("狀態： 已停止")
    $lines.Add("按「啟動派對」後，用下面網址給平板／手機：")
    foreach ($ip in $ips) {
      if ($ip -like '（*') { $lines.Add($ip) }
      else { $lines.Add("http://${ip}:$port") }
    }
  }
  $txtInfo.Text = ($lines -join [Environment]::NewLine)

  $btnStart.Enabled = -not $running
  $btnStop.Enabled = $running
  $btnOpenPlayer.Enabled = $running
  $btnCopy.Enabled = $running -and ($ips | Where-Object { $_ -notlike '（*' }).Count -gt 0

  if ($running) { Write-Status "派對進行中" 'DarkGreen' }
  else { Write-Status "待命中 — 可啟動" 'DimGray' }
}

function Start-Server {
  Ensure-PartyDir
  if (Test-ServerRunning) {
    [System.Windows.Forms.MessageBox]::Show('伺服器已在運作中。', '開唱') | Out-Null
    Refresh-Ui
    return
  }

  $port = [int]$numPort.Value
  Save-Port $port

  if (-not (Test-Path (Join-Path $Root 'package.json'))) {
    throw "找不到 package.json，請確認控制台放在專案裡。"
  }
  if (-not (Test-Path (Join-Path $Root 'dist\player.html'))) {
    $answer = [System.Windows.Forms.MessageBox]::Show(
      "尚未建置前端（缺少 dist）。要現在執行 npm install + npm run build 嗎？",
      '開唱',
      [System.Windows.Forms.MessageBoxButtons]::YesNo
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
      Invoke-Prepare
    } else {
      return
    }
  }

  Write-Status '啟動中…' 'DarkOrange'
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
  $outBuilder = New-Object System.Text.StringBuilder
  $errBuilder = New-Object System.Text.StringBuilder
  $outHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $e)
    if ($e.Data) {
      [void]$outBuilder.AppendLine($e.Data)
      Add-Content -Path $LogFile -Value $e.Data -Encoding UTF8
    }
  }
  $errHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $e)
    if ($e.Data) {
      [void]$errBuilder.AppendLine($e.Data)
      Add-Content -Path $errLog -Value $e.Data -Encoding UTF8
    }
  }
  $proc.add_OutputDataReceived($outHandler)
  $proc.add_ErrorDataReceived($errHandler)
  $null = $proc.Start()
  $proc.BeginOutputReadLine()
  $proc.BeginErrorReadLine()
  Set-Content -Path $PidFile -Value $proc.Id -Encoding UTF8

  # Wait until port listens (max ~15s)
  $ok = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    if (Get-ListeningPid $port) { $ok = $true; break }
    if ($proc.HasExited) { break }
  }

  if (-not $ok) {
    Write-Status '啟動失敗，請看 .party/server.log' 'Firebrick'
    [System.Windows.Forms.MessageBox]::Show(
      "啟動失敗或逾時。請檢查是否已安裝 Node.js，或查看：`n$LogFile",
      '開唱'
    ) | Out-Null
  }
  Refresh-Ui
}

function Stop-Server {
  Write-Status '關閉中…' 'DarkOrange'
  $port = Get-ConfiguredPort
  $pids = @()
  $fromFile = $null
  if (Test-Path $PidFile) {
    $raw = (Get-Content $PidFile -Raw).Trim()
    if ($raw -match '^\d+$') { $fromFile = [int]$raw; $pids += $fromFile }
  }
  $listenPid = Get-ListeningPid $port
  if ($listenPid) { $pids += $listenPid }
  $pids = $pids | Select-Object -Unique

  foreach ($id in $pids) {
    try {
      Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    } catch {}
  }

  # Extra cleanup: node server/index.js under this repo
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like '*server/index.js*' -and $_.CommandLine -like "*$Root*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 400
  Refresh-Ui
}

function Invoke-Prepare {
  Write-Status '安裝／建置中（第一次可能要幾分鐘）…' 'DarkOrange'
  $npm = Get-NpmCmd
  $form.Enabled = $false
  try {
    $install = Start-Process -FileName $npm -ArgumentList 'install' -WorkingDirectory $Root -Wait -PassThru -NoNewWindow
    if ($install.ExitCode -ne 0) { throw "npm install 失敗（exit $($install.ExitCode)）" }
    $build = Start-Process -FileName $npm -ArgumentList 'run','build' -WorkingDirectory $Root -Wait -PassThru -NoNewWindow
    if ($build.ExitCode -ne 0) { throw "npm run build 失敗（exit $($build.ExitCode)）" }
    [System.Windows.Forms.MessageBox]::Show('建置完成，可以按「啟動派對」。', '開唱') | Out-Null
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
  Write-Status "已複製：$url" 'DarkGreen'
}

function Open-Player {
  Start-Process (Get-PrimaryLanUrl)
}

function Get-StartupShortcutPath {
  $startup = [Environment]::GetFolderPath('Startup')
  return (Join-Path $startup '開唱派對控制台.lnk')
}

function Install-Startup {
  $target = Join-Path $Root '啟動開唱.bat'
  if (-not (Test-Path $target)) { throw "找不到 $target" }
  $lnkPath = Get-StartupShortcutPath
  $w = New-Object -ComObject WScript.Shell
  $sc = $w.CreateShortcut($lnkPath)
  $sc.TargetPath = $target
  $sc.WorkingDirectory = $Root
  $sc.WindowStyle = 7
  $sc.Description = '開唱私人派對控制台'
  $sc.Save()
  [System.Windows.Forms.MessageBox]::Show("已加入開機啟動：`n$lnkPath`n`n開機後會開啟控制台（不會自動開派對，避免沒聚會也佔資源）。", '開唱') | Out-Null
}

function Remove-Startup {
  $lnkPath = Get-StartupShortcutPath
  if (Test-Path $lnkPath) {
    Remove-Item $lnkPath -Force
    [System.Windows.Forms.MessageBox]::Show('已移除開機啟動。', '開唱') | Out-Null
  } else {
    [System.Windows.Forms.MessageBox]::Show('目前沒有開機啟動捷徑。', '開唱') | Out-Null
  }
}

# ---- UI ----
$form = New-Object System.Windows.Forms.Form
$form.Text = '開唱｜私人派對控制台'
$form.Size = New-Object System.Drawing.Size(560, 480)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font('Microsoft JhengHei UI', 10)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = '電腦端伺服器控制（平板／手機不用裝）'
$lblTitle.Location = New-Object System.Drawing.Point(20, 16)
$lblTitle.Size = New-Object System.Drawing.Size(500, 28)
$lblTitle.Font = New-Object System.Drawing.Font('Microsoft JhengHei UI', 12, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblTitle)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(20, 48)
$lblStatus.Size = New-Object System.Drawing.Size(500, 24)
$form.Controls.Add($lblStatus)

$lblPort = New-Object System.Windows.Forms.Label
$lblPort.Text = '埠號'
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
$btnStart.Text = '啟動派對'
$btnStart.Location = New-Object System.Drawing.Point(180, 76)
$btnStart.Size = New-Object System.Drawing.Size(110, 34)
$btnStart.Add_Click({
  try { Start-Server } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", '開唱') | Out-Null
    Refresh-Ui
  }
})
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = '關閉派對'
$btnStop.Location = New-Object System.Drawing.Point(300, 76)
$btnStop.Size = New-Object System.Drawing.Size(110, 34)
$btnStop.Add_Click({
  try { Stop-Server } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", '開唱') | Out-Null
    Refresh-Ui
  }
})
$form.Controls.Add($btnStop)

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = '重新整理'
$btnRefresh.Location = New-Object System.Drawing.Point(420, 76)
$btnRefresh.Size = New-Object System.Drawing.Size(100, 34)
$btnRefresh.Add_Click({ Refresh-Ui })
$form.Controls.Add($btnRefresh)

$txtInfo = New-Object System.Windows.Forms.TextBox
$txtInfo.Multiline = $true
$txtInfo.ReadOnly = $true
$txtInfo.ScrollBars = 'Vertical'
$txtInfo.Location = New-Object System.Drawing.Point(20, 126)
$txtInfo.Size = New-Object System.Drawing.Size(500, 220)
$txtInfo.Font = New-Object System.Drawing.Font('Consolas', 10)
$form.Controls.Add($txtInfo)

$btnPrepare = New-Object System.Windows.Forms.Button
$btnPrepare.Text = '第一次準備（install + build）'
$btnPrepare.Location = New-Object System.Drawing.Point(20, 360)
$btnPrepare.Size = New-Object System.Drawing.Size(220, 34)
$btnPrepare.Add_Click({
  try { Invoke-Prepare } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", '開唱') | Out-Null
    Refresh-Ui
  }
})
$form.Controls.Add($btnPrepare)

$btnOpenPlayer = New-Object System.Windows.Forms.Button
$btnOpenPlayer.Text = '開啟播放頁'
$btnOpenPlayer.Location = New-Object System.Drawing.Point(250, 360)
$btnOpenPlayer.Size = New-Object System.Drawing.Size(120, 34)
$btnOpenPlayer.Add_Click({ Open-Player })
$form.Controls.Add($btnOpenPlayer)

$btnCopy = New-Object System.Windows.Forms.Button
$btnCopy.Text = '複製平板網址'
$btnCopy.Location = New-Object System.Drawing.Point(380, 360)
$btnCopy.Size = New-Object System.Drawing.Size(140, 34)
$btnCopy.Add_Click({ Copy-LanUrl })
$form.Controls.Add($btnCopy)

$btnStartup = New-Object System.Windows.Forms.Button
$btnStartup.Text = '加入開機啟動（開控制台）'
$btnStartup.Location = New-Object System.Drawing.Point(20, 404)
$btnStartup.Size = New-Object System.Drawing.Size(250, 30)
$btnStartup.Add_Click({
  try { Install-Startup } catch {
    [System.Windows.Forms.MessageBox]::Show("$_", '開唱') | Out-Null
  }
})
$form.Controls.Add($btnStartup)

$btnUnstartup = New-Object System.Windows.Forms.Button
$btnUnstartup.Text = '移除開機啟動'
$btnUnstartup.Location = New-Object System.Drawing.Point(280, 404)
$btnUnstartup.Size = New-Object System.Drawing.Size(140, 30)
$btnUnstartup.Add_Click({ Remove-Startup })
$form.Controls.Add($btnUnstartup)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({ Refresh-Ui })
$timer.Start()

$form.Add_Shown({ Refresh-Ui })
$form.Add_FormClosed({ $timer.Stop() })

[void]$form.ShowDialog()
