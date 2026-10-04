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

REM Clear previous crash marker so we only fail on a NEW crash this run.
if exist "%~dp0.party\launcher-crash.log" del /f /q "%~dp0.party\launcher-crash.log" >nul 2>nul
if exist "%~dp0.party\launcher-alive.flag" del /f /q "%~dp0.party\launcher-alive.flag" >nul 2>nul

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\PartyControl.ps1"
set ERR=%ERRORLEVEL%

REM PowerShell may return a leftover native exit code (often 2) even after a
REM normal GUI close. Trust crash/alive markers instead of ERRORLEVEL alone.
if exist "%~dp0.party\launcher-crash.log" (
  echo.
  echo Launcher crashed.
  echo --- launcher-crash.log ---
  type "%~dp0.party\launcher-crash.log"
  if exist "%~dp0.party\launcher-boot.log" (
    echo --- launcher-boot.log ---
    type "%~dp0.party\launcher-boot.log"
  )
  echo.
  echo In PowerShell:
  echo   cd C:\Users\tr197\KTV
  echo   git pull
  echo   .\start-kaichang.bat
  echo Confirm the window shows: launcher build 2026-10-04g
  pause
  exit /b 1
)

if not exist "%~dp0.party\launcher-alive.flag" (
  echo.
  echo Launcher UI did not start.
  echo PowerShell exit code: %ERR%
  if exist "%~dp0.party\launcher-boot.log" (
    echo --- launcher-boot.log ---
    type "%~dp0.party\launcher-boot.log"
  )
  echo.
  echo In PowerShell:
  echo   cd C:\Users\tr197\KTV
  echo   git pull
  echo   .\start-kaichang.bat
  echo Confirm the window shows: launcher build 2026-10-04g
  pause
  exit /b 1
)

exit /b 0
