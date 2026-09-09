Write-Host "Starting Django Backend on port 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; python manage.py runserver 8080"

Write-Host "Starting Vite Frontend on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev"

Write-Host "Both servers are launching!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8080" -ForegroundColor White
