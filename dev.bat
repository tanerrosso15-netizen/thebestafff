@echo off
REM Gelistirme modu - iki ayri pencerede backend (8000) + frontend (5173)
setlocal
cd /d "%~dp0"

start "PQP Backend" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
start "PQP Frontend" cmd /k "cd frontend && npm run dev"

echo Backend: http://localhost:8000   Frontend (dev): http://localhost:5173
endlocal
