@echo off
REM AlterEgo PWA Backend Setup Script for Windows
REM This script sets up the Python environment and installs dependencies

echo Setting up AlterEgo PWA Backend...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv alterego-backend

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call alterego-backend\Scripts\activate

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

echo Setup complete!
echo.
echo To start the server:
echo 1. Activate the virtual environment: alterego-backend\Scripts\activate
echo 2. Run the server: python main.py
echo.
echo The server will be available at: http://127.0.0.1:8000
echo API documentation will be at: http://127.0.0.1:8000/docs

pause
