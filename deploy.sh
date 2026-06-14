#!/usr/bin/env bash
# Sunucuda tek komut kurulum + teşhis
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "============================================"
echo "  PQP Affiliate — Sunucu Kurulumu"
echo "============================================"

# 1) .env
if [ ! -f backend/.env ]; then
  echo "[1/4] backend/.env oluşturuluyor..."
  cp backend/.env.example backend/.env
  echo "      → backend/.env dosyasını düzenlemeyi unutmayın (SECRET_KEY, şifre)"
else
  echo "[1/4] backend/.env mevcut ✓"
fi
mkdir -p backend/data backend/data/uploads

# 2) Docker kontrol
if ! command -v docker >/dev/null 2>&1; then
  echo ""
  echo "HATA: Docker yüklü değil."
  echo "Ubuntu için:"
  echo "  curl -fsSL https://get.docker.com | sh"
  echo "  sudo usermod -aG docker \$USER"
  echo "  (çıkış yapıp tekrar girin)"
  exit 1
fi
echo "[2/4] Docker ✓"

# 3) Build & start
echo "[3/4] Container başlatılıyor (ilk sefer 2-5 dk sürebilir)..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "[4/4] Sağlık kontrolü bekleniyor..."
OK=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    OK=1
    break
  fi
  sleep 3
done

echo ""
echo "============================================"
docker compose ps
echo "============================================"

if [ "$OK" -eq 1 ]; then
  PUBLIC_IP=$(curl -sf --max-time 3 ifconfig.me 2>/dev/null || curl -sf --max-time 3 icanhazip.com 2>/dev/null || echo "SUNUCU-IP-ADRESINIZ")
  PORT="${PORT:-8000}"
  echo ""
  echo "✓ Panel SUNUCUDA çalışıyor!"
  echo ""
  echo "  Sunucu içinden:  http://127.0.0.1:${PORT}"
  echo "  Tarayıcıdan:     http://${PUBLIC_IP}:${PORT}"
  echo "  Giriş:           admin@panel.com"
  echo ""
  echo "Tarayıcıdan açılmıyorsa (en sık sebep: firewall):"
  echo "  sudo ufw allow ${PORT}/tcp"
  echo "  sudo ufw reload"
  echo ""
  echo "Bulut panelinde (Hetzner/DO/AWS) Security Group / Firewall"
  echo "→ gelen TCP ${PORT} portunu açın."
else
  echo ""
  echo "✗ Panel yanıt vermiyor. Son loglar:"
  docker compose logs --tail=100
  echo ""
  echo "Manuel test: curl -v http://127.0.0.1:8000/api/health"
  exit 1
fi
