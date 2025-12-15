@echo off
echo.
echo ============================================
echo   Building TallyDash Pro Connector EXE
echo ============================================
echo.

:: Install PyInstaller if not present
pip install pyinstaller

:: Build the executable
pyinstaller --onefile --windowed --name "TallyDashProConnector" --icon=icon.ico TallyConnectorApp.py

echo.
echo ============================================
echo   Build Complete!
echo   Find the EXE in: dist\TallyDashProConnector.exe
echo ============================================
echo.
pause

