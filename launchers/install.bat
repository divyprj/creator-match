@echo off
setlocal
set "SCRIPT=%~dp0..\scripts\launcher.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Action install
