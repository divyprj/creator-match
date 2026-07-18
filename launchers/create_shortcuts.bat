@echo off
cd /d "%~dp0.."
title Creator Match Shortcut Creator
echo =======================================================
echo     Creating Creator Match Desktop Shortcuts
echo =======================================================
echo.
echo This will create shortcuts for all Creator Match batch files
echo on your Desktop, fully styled with the Creator Match icon!
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\create_shortcuts.ps1"
echo.
echo Done! Please check your Desktop.
echo =======================================================
pause
