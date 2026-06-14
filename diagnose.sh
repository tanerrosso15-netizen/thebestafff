#!/usr/bin/env bash
# Hızlı teşhis — panel neden açılmıyor?
set -uo pipefail
PORT="${PORT:-8000}"

echo "=== PQP Teşhis ==="
echo ""

echo "1) Docker container durumu:"
docker compose ps 2>/dev/null || echo "   docker compose çalışmıyor / proje dizininde değilsiniz"
echo ""

echo "2) Port dinleniyor mu (${PORT}):"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ":${PORT} " || echo "   Port ${PORT} dinlenmiyor!"
elif command -v netstat >/dev/null 2>&1; then
  netstat -tlnp 2>/dev/null | grep ":${PORT} " || echo "   Port ${PORT} dinlenmiyor!"
fi
echo ""

echo "3) Yerel health check:"
curl -sv --max-time 5 "http://127.0.0.1:${PORT}/api/health" 2>&1 | tail -5
echo ""

echo "4) Son container logları:"
docker compose logs --tail=30 2>/dev/null || true
echo ""

echo "5) Firewall (ufw):"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw status 2>/dev/null || ufw status 2>/dev/null || echo "   ufw durumu okunamadı"
else
  echo "   ufw yok"
fi
echo ""

PUBLIC_IP=$(curl -sf --max-time 3 ifconfig.me 2>/dev/null || echo "?")
echo "6) Dış IP: ${PUBLIC_IP}"
echo "   Tarayıcıda deneyin: http://${PUBLIC_IP}:${PORT}"
echo ""
echo "Çözüm adımları:"
echo "  chmod +x deploy.sh && ./deploy.sh"
echo "  sudo ufw allow ${PORT}/tcp && sudo ufw reload"
echo "  Bulut sağlayıcı firewall'unda ${PORT}/tcp açın"
