@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install LTS from https://nodejs.org/
  echo Then run this file again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$path = Join-Path '%CD%' 'launcher\PartyControl.ps1';" ^
  "if (-not (Test-Path -LiteralPath $path)) { Write-Host 'Missing launcher\PartyControl.ps1'; exit 1 };" ^
  "$content = Get-Content -LiteralPath $path -Encoding UTF8 -Raw;" ^
  "Invoke-Expression $content"

if errorlevel 1 (
  echo.
  echo Launcher exited with an error.
  pause
)
