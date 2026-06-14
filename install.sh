#!/usr/bin/env bash
# İlk kurulum — git clone sonrası bir kez çalıştırın
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "=== PQP Affiliate — Kurulum ==="

if ! command -v python3 >/dev/null 2>&1; then
  echo "HATA: python3 gerekli."; exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "HATA: node/npm gerekli (frontend build için)."; exit 1
fi

chmod +x start.sh

[ -f backend/.env ] || cp backend/.env.example backend/.env
mkdir -p backend/data backend/data/uploads

python3 -m venv backend/venv
backend/venv/bin/pip install -q --upgrade pip
backend/venv/bin/pip install -q -r backend/requirements.txt

(cd frontend && npm install && npm run build)

echo ""
echo "Kurulum tamam. Başlatmak için:"
echo "  ./start.sh"
echo ""
echo "Veya Docker ile:"
echo "  docker compose up -d --build"
