@echo off
title Launch Intelligent Data Analytics Platform
echo ==============================================================================
echo  Launching Intelligent Data Analytics ^& Predictive Intelligence Platform
echo ==============================================================================

echo [1/2] Launching Backend Server in new terminal...
start "Analytics Platform - Backend" cmd /c "run_backend.bat"

echo [INFO] Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend Server...
start "Analytics Platform - Frontend" cmd /c "run_frontend.bat"

echo.
echo ==============================================================================
echo  Platform is starting!
echo  - Backend API: http://localhost:8000
echo  - Swagger Docs: http://localhost:8000/docs
echo  - Frontend UI: http://localhost:5173
echo  - Demo Login: demo@platform.ai / demo12345
echo ==============================================================================

