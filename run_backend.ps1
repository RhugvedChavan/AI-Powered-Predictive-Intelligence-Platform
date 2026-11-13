Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " AI-Powered Predictive Intelligence Platform - Backend" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

$py310 = "C:\Users\A\AppData\Local\Programs\Python\Python310\python.exe"

if (Test-Path $py310) {
    Write-Host "[OK] Using Python 3.10 interpreter: $py310" -ForegroundColor Green
    Write-Host "[INFO] Starting Uvicorn on http://localhost:8000 (Swagger docs at /docs)..." -ForegroundColor White
    & $py310 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
} else {
    Write-Host "[WARN] Python 3.10 default path not found, testing system python..." -ForegroundColor Yellow
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
}

