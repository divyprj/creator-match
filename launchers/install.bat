@echo off
cd /d "%~dp0.."
echo ============================================
echo   Creator Match - Install Dependencies
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download it from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Checking for .env.local configuration...
if not exist ".env.local" (
    echo [WARNING] .env.local file not found.
    echo           Copy .env.example to .env.local and fill in your credentials.
) else (
    echo [OK] .env.local found.
)

echo.
echo ============================================
echo   Installation complete.
echo ============================================
pause
