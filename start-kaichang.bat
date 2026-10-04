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

REM Script is UTF-8 with BOM so Windows PowerShell 5.1 can parse it.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\PartyControl.ps1"
set ERR=%ERRORLEVEL%
if not "%ERR%"=="0" (
  echo.
  echo Launcher exited with code %ERR%.
  if exist "%~dp0.party\launcher-crash.log" (
    echo --- launcher-crash.log ---
    type "%~dp0.party\launcher-crash.log"
  )
  pause
  exit /b %ERR%
)
