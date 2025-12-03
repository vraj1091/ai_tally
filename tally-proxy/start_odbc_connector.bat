@echo off
echo ============================================================
echo   TallyDash Pro - ODBC Connector
echo ============================================================
echo.
echo This uses ODBC to connect to Tally - More secure!
echo.
echo Prerequisites:
echo   1. Tally ODBC Driver installed (comes with Tally)
echo   2. DSN configured in Windows ODBC Data Sources
echo   3. Tally running with ODBC enabled
echo.
echo ============================================================
echo.

REM Check if pyodbc is installed
python -c "import pyodbc" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing pyodbc...
    pip install pyodbc
    echo.
)

set /p DSN_NAME="Enter DSN name (press Enter for 'Tally'): "
if "%DSN_NAME%"=="" set DSN_NAME=Tally

echo.
echo Starting ODBC connector with DSN: %DSN_NAME%
echo.

python tally_odbc_connector.py %DSN_NAME%

pause

