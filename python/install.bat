@echo off
REM EasyScribe Python Setup Script for Windows
REM This script installs Python dependencies for local transcription

echo ======================================
echo EasyScribe Python Setup
echo ======================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X Python is not installed!
    echo Please install Python 3.9 or later from https://python.org
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo v Found Python: %PYTHON_VERSION%
echo.

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo X Failed to create virtual environment
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip
if %errorlevel% neq 0 (
    echo X Failed to upgrade pip
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo Installing dependencies...
echo This may take a few minutes...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo X Failed to install dependencies
    pause
    exit /b 1
)

REM Verify installation
echo.
echo Verifying installation...
python -c "import faster_whisper; print('v faster-whisper installed successfully')"
if %errorlevel% neq 0 (
    echo X Verification failed
    pause
    exit /b 1
)

echo.
echo ======================================
echo v Setup completed successfully!
echo ======================================
echo.
echo To use the local transcription engine:
echo 1. Make sure the virtual environment is activated: venv\Scripts\activate.bat
echo 2. The Python transcriber will be started automatically when EasyScribe launches
echo.
echo To deactivate the virtual environment when done: deactivate
echo.

pause
