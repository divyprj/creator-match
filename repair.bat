@echo off
echo ============================================
echo   Creator Match - Repair
echo ============================================
echo.
echo This script will revert ALL source code to
echo the last known working version from GitHub
echo and reinstall dependencies from scratch.
echo.
echo Your .env.local file will be preserved.
echo.
set /p confirm="Are you sure? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo [1/5] Discarding all local code changes...
git checkout -- .
if %errorlevel% neq 0 (
    echo [ERROR] git checkout failed. Make sure git is installed.
    pause
    exit /b 1
)
echo        Done.

echo [2/5] Removing untracked files (excluding .env.local)...
git clean -fd -e .env.local -e .env.vercel -e .env.vercel.production
echo        Done.

echo [3/5] Pulling latest version from GitHub...
git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] git pull failed. Check your network connection.
    pause
    exit /b 1
)
echo        Done.

echo [4/5] Removing old dependencies and build cache...
if exist "node_modules" rmdir /s /q node_modules
if exist ".next" rmdir /s /q .next
if exist "package-lock.json" del /q package-lock.json
echo        Done.

echo [5/5] Reinstalling dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Repair complete.
echo   The project has been restored to the
echo   latest working version from GitHub.
echo.
echo   Run  run.bat  to start the dev server.
echo ============================================
pause
