#!/usr/bin/env bash
# PQP Affiliate Panel — Linux/VPS tek komut başlatma
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "=== PQP Affiliate Panel ==="

# Python venv
if [ ! -d backend/venv ]; then
  echo "[1/4] Python sanal ortam..."
  python3 -m venv backend/venv
  backend/venv/bin/pip install -q --upgrade pip
  backend/venv/bin/pip install -q -r backend/requirements.txt
fi

# Frontend build
if [ ! -d frontend/dist ]; then
  echo "[2/4] Frontend derleniyor..."
  (cd frontend && npm install && npm run build)
fi

# Ortam dosyası
if [ ! -f backend/.env ]; then
  echo "[3/4] .env oluşturuluyor..."
  cp backend/.env.example backend/.env
fi

mkdir -p backend/data backend/data/uploads

PORT="${PORT:-8000}"
echo "[4/4] Sunucu: http://0.0.0.0:${PORT}"
cd backend
exec ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
