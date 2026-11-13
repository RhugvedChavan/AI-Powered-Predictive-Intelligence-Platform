@echo off
title Install Dependencies - AI-Powered Predictive Intelligence Platform
echo ==============================================================================
echo  Installing Dependencies for AI-Powered Predictive Intelligence Platform
echo ==============================================================================

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found in PATH!
    pause
    exit /b 1
)

echo [INFO] Detected Python:
python --version

echo.
echo [INFO] Upgrading pip and installing requirements.txt...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ==============================================================================
    echo  [SUCCESS] All dependencies installed successfully!
    echo  You can now start the platform using run_backend.bat or python.exe -m uvicorn
    echo ==============================================================================
) else (
    echo.
    echo [ERROR] Dependency installation encountered issues.
)

pause
