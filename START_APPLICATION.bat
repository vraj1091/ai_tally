@echo off
echo ========================================
echo   AI TALLY ASSISTANT - QUICK START
echo ========================================
echo.

echo Checking if servers are running...
echo.

netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend server is RUNNING on port 8000
) else (
    echo [WARN] Backend server is NOT running
    echo Please start: cd backend ^& python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
)

netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend server is RUNNING on port 5173
) else (
    echo [WARN] Frontend server is NOT running
    echo Please start: cd frontend ^& npm run dev
)

echo.
echo ========================================
echo   Opening application in browser...
echo ========================================
echo.
echo Application URL: http://localhost:5173
echo Login Email: test2@mail.com
echo Login Password: test2@123
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   Additional URLs:
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Health Check: http://localhost:8000/health
echo.
echo ========================================
echo   Press any key to also open API docs
echo ========================================
pause >nul

start http://localhost:8000/docs

echo.
echo Application launched successfully!
echo.
pause

