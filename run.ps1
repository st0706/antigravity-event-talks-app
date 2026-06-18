# Run script for BQ Pulse application
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting BQ Pulse - BigQuery Release Notes" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (!(Test-Path venv)) {
    Write-Host "[*] Creating Virtual Environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "[*] Installing dependencies..." -ForegroundColor Yellow
    .\venv\Scripts\python.exe -m pip install -r requirements.txt
}

Write-Host "[*] Launching server on http://127.0.0.1:5000" -ForegroundColor Green
Write-Host "Press Ctrl+C to terminate the server." -ForegroundColor Gray
.\venv\Scripts\python.exe app.py
