@echo off
echo Starting Django Backend on port 8080...
start cmd /k "cd backend && python manage.py runserver 8080"

echo Starting Vite Frontend on port 5173...
start cmd /k "npm run dev"

echo.
echo ==============================================
echo Frontend:  http://localhost:5173
echo Backend:   http://127.0.0.1:8080
echo ==============================================
