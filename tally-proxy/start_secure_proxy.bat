@echo off
echo ============================================================
echo   TallyDash Pro - SECURE Local Tally Proxy
echo ============================================================
echo.
echo This proxy has security features:
echo   - Authentication token (shown after start)
echo   - Only accepts localhost connections
echo   - Rate limiting
echo   - Request logging
echo.
echo ============================================================
echo.

set /p TALLY_IP="Enter Tally IP address (press Enter for localhost): "
set /p TALLY_PORT="Enter Tally port (press Enter for 9000): "

if "%TALLY_IP%"=="" set TALLY_IP=localhost
if "%TALLY_PORT%"=="" set TALLY_PORT=9000

echo.
echo Starting SECURE proxy for %TALLY_IP%:%TALLY_PORT%...
echo.

python secure_tally_proxy.py %TALLY_IP% %TALLY_PORT%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python not found! Please install Python 3 from python.org
    echo.
)
pause

