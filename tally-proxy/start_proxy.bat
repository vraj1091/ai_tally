@echo off
echo ============================================================
echo   TallyDash Pro - Local Tally Proxy
echo ============================================================
echo.
echo This will start the local proxy to connect your browser
echo to Tally ERP running on your computer.
echo.
echo Make sure:
echo   1. Tally ERP is running
echo   2. Gateway is enabled (F12 - Server - Port 9000)
echo.
echo ============================================================
echo.

python tally_proxy.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python not found! Please install Python 3 from python.org
    echo.
    pause
)

