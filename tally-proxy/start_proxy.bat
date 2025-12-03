@echo off
echo ============================================================
echo   TallyDash Pro - Local Tally Proxy
echo ============================================================
echo.
echo This proxy connects your browser to Tally ERP.
echo.
echo Make sure Tally is running with Gateway enabled:
echo   F12 (Configure) - Connectivity - Server - Port 9000
echo.
echo ============================================================
echo.

set /p TALLY_IP="Enter Tally IP address (press Enter for localhost): "

if "%TALLY_IP%"=="" (
    echo.
    echo Starting proxy for localhost:9000...
    python tally_proxy.py
) else (
    echo.
    echo Starting proxy for %TALLY_IP%:9000...
    python tally_proxy.py %TALLY_IP%
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python not found! Please install Python 3 from python.org
    echo.
)
pause

