$RootDir = Resolve-Path "$PSScriptRoot\.."
$BackendDir = Resolve-Path "$RootDir\backend"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Launching PerformanceOS Full Stack + Celery   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

Write-Host "[1/3] Starting Django Backend on port 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendDir'; python manage.py runserver 8080"

Write-Host "[2/3] Starting Vite Frontend on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir'; npm run dev"

Write-Host "[3/3] Starting Celery Worker (Pool=solo for Windows)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendDir'; python -m celery -A config worker -l INFO -P solo"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "Services are launching in separate windows!" -ForegroundColor Yellow
Write-Host "Frontend:      http://localhost:5173" -ForegroundColor White
Write-Host "Backend API:   http://127.0.0.1:8080" -ForegroundColor White
Write-Host "Celery Worker: Active (Pool=solo)" -ForegroundColor White
Write-Host "Redis:         Ensure Redis 7 is running (e.g. docker compose up -d)" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Yellow

