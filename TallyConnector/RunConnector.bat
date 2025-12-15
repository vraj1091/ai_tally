@echo off
title TallyDash Pro Connector
echo.
echo ============================================
echo   TallyDash Pro - Tally Connector
echo ============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

:: Check if dependencies are installed
python -c "import websockets, requests" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo.
)

:: Run the connector
echo Starting TallyDash Pro Connector...
python TallyConnectorApp.py

pause

