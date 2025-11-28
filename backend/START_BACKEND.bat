@echo off
echo ============================================
echo AI TALLY ASSISTANT - STARTING BACKEND
echo ============================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo Checking Python...
python --version
echo.

echo Starting FastAPI backend...
echo Server will run on: http://localhost:8000
echo Docs available at: http://localhost:8000/docs
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 5 --timeout-graceful-shutdown 10

pause

