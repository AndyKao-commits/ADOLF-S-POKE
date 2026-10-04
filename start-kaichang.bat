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

if not exist "%~dp0launcher\PartyControl.ps1" (
  echo Missing launcher\PartyControl.ps1
  pause
  exit /b 1
)

if not exist "%~dp0.party" mkdir "%~dp0.party"

REM Keep this console open only if the GUI process fails to start.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\PartyControl.ps1"
set ERR=%ERRORLEVEL%
if not "%ERR%"=="0" (
  echo.
  echo Launcher exited with code %ERR%.
  if exist "%~dp0.party\launcher-crash.log" (
    echo --- launcher-crash.log ---
    type "%~dp0.party\launcher-crash.log"
  )
  if exist "%~dp0.party\npm-install.log" (
    echo --- last lines npm-install.log ---
    powershell -NoProfile -Command "Get-Content -LiteralPath '%~dp0.party\npm-install.log' -Tail 20 -ErrorAction SilentlyContinue"
  )
  if exist "%~dp0.party\npm-build.log" (
    echo --- last lines npm-build.log ---
    powershell -NoProfile -Command "Get-Content -LiteralPath '%~dp0.party\npm-build.log' -Tail 20 -ErrorAction SilentlyContinue"
  )
  echo.
  if exist "%~dp0.party\prepare.log" (
    echo --- prepare.log ---
    type "%~dp0.party\prepare.log"
  )
  echo If this keeps happening, in PowerShell run:
  echo   cd C:\Users\tr197\KTV
  echo   git pull
  echo   .\start-kaichang.bat
  echo Confirm the window shows: launcher build 2026-10-04e
  pause
  exit /b %ERR%
)
