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
    echo           Create .env.local with your credentials before running.
    echo.
)

echo Starting development server on http://localhost:3000 ...
echo Press Ctrl+C to stop the server.
echo.
call npm run dev
