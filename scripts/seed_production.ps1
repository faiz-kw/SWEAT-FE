# ==============================================================================
# PerformanceOS / SWEAT - Production Deployment Seed Runner (Windows PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path "$ScriptDir\.."
$BackendDir = Resolve-Path "$RootDir\backend"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Starting PerformanceOS Deployment Database Seeder (PowerShell)..." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

Set-Location -Path $BackendDir

# 1. Run migrations on master DB
Write-Host "[1/2] Running master database migrations..." -ForegroundColor Yellow
python manage.py migrate --noinput

# 2. Run seed_deployment command
Write-Host "[2/2] Running deployment seeder..." -ForegroundColor Yellow
python manage.py seed_deployment @args

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " Deployment database seeding completed successfully!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
