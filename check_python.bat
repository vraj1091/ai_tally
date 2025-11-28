@echo off
echo Checking Python... > python_check.txt
python --version >> python_check.txt 2>&1
if %errorlevel% neq 0 (
    echo Python not found, trying py... >> python_check.txt
    py --version >> python_check.txt 2>&1
)
echo PATH: %PATH% >> python_check.txt
