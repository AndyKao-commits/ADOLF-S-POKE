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

REM Script is UTF-8 with BOM so Windows PowerShell 5.1 can parse it.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\PartyControl.ps1"
if errorlevel 1 (
  echo.
  echo Launcher exited with an error.
  pause
)
