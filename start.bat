@echo off
REM PQP Affiliate Panel - tek komutla baslat (production: backend derlenmis frontend'i sunar)
setlocal

cd /d "%~dp0"

echo === PQP Affiliate Panel ===

REM 1) Backend bagimliliklari
if not exist "backend\venv" (
  echo [1/3] Python sanal ortam olusturuluyor...
  python -m venv backend\venv
  backend\venv\Scripts\python.exe -m pip install --upgrade pip
  backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

REM 2) Frontend build (yoksa)
if not exist "frontend\dist" (
  echo [2/3] Frontend derleniyor...
  pushd frontend
  call npm install
  call npm run build
  popd
)

REM 3) .env
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\data\uploads" mkdir "backend\data\uploads"

echo [3/3] Sunucu baslatiliyor: http://localhost:8000
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

endlocal
