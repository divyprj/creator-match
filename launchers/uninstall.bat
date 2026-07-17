@echo off
cd /d "%~dp0.."
echo ============================================
echo   Creator Match - Uninstall / Clean
echo ============================================
echo.
echo This will remove all installed dependencies
echo and build artifacts from the project.
echo.
echo Your source code and .env.local will NOT be deleted.
echo.
set /p confirm="Are you sure? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo [1/3] Removing node_modules...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo        Removed.
) else (
    echo        Not found, skipping.
)

echo [2/3] Removing .next build cache...
if exist ".next" (
    rmdir /s /q .next
    echo        Removed.
) else (
    echo        Not found, skipping.
)

echo [3/3] Removing package-lock.json...
if exist "package-lock.json" (
    del /q package-lock.json
    echo        Removed.
) else (
    echo        Not found, skipping.
)

echo.
echo ============================================
echo   Uninstall complete.
echo   Run install.bat to reinstall dependencies.
echo ============================================
pause
