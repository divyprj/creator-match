@echo off
echo ============================================
echo   Creator Match - Start Development Server
echo ============================================
echo.

if not exist "node_modules" (
    echo [WARNING] node_modules not found. Running install first...
    call npm install
    echo.
)

if not exist ".env.local" (
    echo [WARNING] .env.local file not found.
    echo           The app may fail to connect to Supabase or Gemini.
    echo.
)

echo Starting development server...
start "CreatorMatchDevServer" cmd /c "npm run dev"

echo Waiting for server to boot...
timeout /t 4 /noexec >nul

echo Opening browser at http://localhost:3000 ...
start http://localhost:3000

exit
