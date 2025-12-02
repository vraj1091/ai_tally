@echo off
echo ============================================
echo AI TALLY ASSISTANT - STARTING FRONTEND
echo ============================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo Checking Node.js...
node --version
echo.

echo Starting React frontend...
echo App will open at: http://localhost:5173
echo.

npm run dev

pause

