@echo off
setlocal

set "ROOT_DIR=%~dp0.."
set "BACKEND_DIR=%ROOT_DIR%\backend"

echo ==============================================
echo  Launching Fitness Command Center Full Stack  
echo ==============================================

echo [1/2] Starting Django Backend on port 8080...
start "Django Backend" cmd /k "cd /d "%BACKEND_DIR%" && python manage.py runserver 8080"

echo [2/2] Starting Vite Frontend on port 5173...
start "Vite Frontend" cmd /k "cd /d "%ROOT_DIR%" && npm run dev"

echo.
echo ==============================================
echo Frontend:  http://localhost:5173
echo Backend:   http://127.0.0.1:8080
echo ==============================================
