@echo off
REM filepath: c:\Users\Charles\Desktop\Programming\AI\PROJECTS\ALTEREGO-pwa\runapp.bat
echo Starting AlterEgo PWA...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist node_modules\ (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build and start the application
echo Building the application...
call npm run build-dev
if %ERRORLEVEL% neq 0 (
    echo Error: Build failed
    pause
    exit /b 1
)

REM Open another terminal for react devtools
start cmd /k "react-devtools --port 8097"
REM Check if react-devtools is installed
where react-devtools >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: react-devtools is not installed or not in PATH
    echo Please install react-devtools globally using: npm install -g react-devtools
    pause
    exit /b 1
)

REM Start the application
set PORT=3000
echo Starting the application...
call npm run start-dev