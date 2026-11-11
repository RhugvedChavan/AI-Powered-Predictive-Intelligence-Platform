@echo off
title Analytics Platform Frontend Dev Server
echo ==============================================================================
echo  Intelligent Data Analytics ^& Predictive Intelligence Platform - Frontend
echo ==============================================================================

echo [INFO] Starting Vite development server on http://localhost:5173...
echo.

node node_modules\vite\bin\vite.js --port 5173

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend exited with code %errorlevel%.
    pause
)
