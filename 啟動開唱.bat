@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 找不到 Node.js。請先安裝 LTS： https://nodejs.org/
  echo 安裝完成後再雙擊本檔。
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\PartyControl.ps1"
if errorlevel 1 (
  echo.
  echo 控制台結束時發生錯誤。
  pause
)
