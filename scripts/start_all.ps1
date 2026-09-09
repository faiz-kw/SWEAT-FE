$RootDir = Resolve-Path "$PSScriptRoot\.."
$BackendDir = Resolve-Path "$RootDir\backend"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Launching Fitness Command Center Full Stack   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

Write-Host "[1/2] Starting Django Backend on port 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendDir'; python manage.py runserver 8080"

Write-Host "[2/2] Starting Vite Frontend on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir'; npm run dev"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "Both servers are launching in separate windows!" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8080" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Yellow
