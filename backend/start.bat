@echo off
REM AlterEgo PWA Backend Start Script for Windows
REM This script starts the Python backend server
echo Starting AlterEgo PWA Backend...
REM Check if virtual environment is activated
REM Activate virtual environment
call ./alterego-backend\Scripts\activate
if defined VIRTUAL_ENV (
    echo Virtual environment is activated.
) else (
    echo Virtual environment is not activated. Please activate it first.
    echo Run: alterego-backend\Scripts\activate
    pause
    exit /b 1
)
REM Start the server
echo Starting the server...
python main.py
if errorlevel 1 (
    echo Failed to start the server. Please check for errors.
    pause
    exit /b 1
)
echo Server started successfully at port 8000!