@echo off
cd /d "%~dp0.."
echo ============================================
echo   Creator Match - Stop Server
echo ============================================
echo.

echo [1/2] Stopping development server...
taskkill /fi "WINDOWTITLE eq CreatorMatchDevServer" /f >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /pid %%a /f >nul 2>nul
)
echo        Done.

echo [2/2] Closing browser tab...
powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*localhost:3000*' -or $_.MainWindowTitle -like '*Creator Match*' } | Stop-Process -Force -ErrorAction SilentlyContinue"
echo        Done.

echo.
echo Server stopped.
timeout /t 2 /noexec >nul
exit
