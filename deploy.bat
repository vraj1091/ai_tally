@echo off
REM AI Tally Assistant - Windows Deployment Script

echo.
echo ==========================================
echo   AI Tally Assistant - Deployment Script
echo ==========================================
echo.

REM Check if Docker is installed
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
where docker-compose >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
echo.

REM Check for environment files
if not exist "backend\.env" (
    echo [WARNING] backend\.env not found. Creating from example...
    if exist ".env.example" (
        copy .env.example backend\.env >nul
        echo [WARNING] Please update backend\.env with your configuration
    )
)

if not exist "frontend\.env" (
    echo [WARNING] frontend\.env not found. Creating from example...
    if exist "frontend\.env.example" (
        copy frontend\.env.example frontend\.env >nul
        echo [WARNING] Please update frontend\.env with your configuration
    )
)

echo.
echo [INFO] Building Docker images...
docker-compose build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [INFO] Starting services...
docker-compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start services!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Deployment Complete!
echo ==========================================
echo.
echo Access your application:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo View logs:
echo   docker-compose logs -f
echo.
echo Stop services:
echo   docker-compose down
echo.
pause

