@echo off
setlocal enabledelayedexpansion
title Analytics Platform Backend Server
echo ==============================================================================
echo  Intelligent Data Analytics ^& Predictive Intelligence Platform - Backend
echo ==============================================================================

:: Prioritize Python 3.10 where all scientific and ML packages are installed
set "PY_EXE=C:\Users\A\AppData\Local\Programs\Python\Python310\python.exe"

if not exist "!PY_EXE!" (
    echo [INFO] Checking system PATH for Python...
    where python >nul 2>nul
    if !errorlevel! equ 0 (
        for /f "delims=" %%I in ('where python') do (
            if not defined PY_EXE set "PY_EXE=%%I"
        )
    )
)

echo [OK] Using Python Interpreter: "!PY_EXE!"
echo [INFO] Starting Uvicorn server on http://0.0.0.0:8000 (Swagger docs at /docs)...
echo.

"!PY_EXE!" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Server exited with code !errorlevel!.
    pause
)

