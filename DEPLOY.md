# Deploy Rehberi

Backend kendi sunucunuzda çalışır. Repo clone → tek komut deploy.

| Bileşen | Nerede |
|---------|--------|
| Tam panel (API + arayüz) | VPS — `docker compose` veya `./start.sh` |
| Sadece arayüz (opsiyonel) | Vercel — `frontend/` |

---

## Hızlı başlangıç

```bash
git clone <repository-url>
cd affiliate-panel
chmod +x deploy.sh diagnose.sh
./deploy.sh
```

Giriş: `.env` içindeki `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD`

### Panel açılmıyorsa

```bash
./diagnose.sh
curl http://127.0.0.1:8000/api/health
sudo ufw allow 8000/tcp && sudo ufw reload
```

Bulut firewall'unda **Inbound TCP 8000** açın.

---

## Docker (manuel)

```bash
cp backend/.env.example backend/.env
nano backend/.env
docker compose up -d --build
docker compose logs -f
```

Güncelleme: `git pull && docker compose up -d --build`

---

## Ortam değişkenleri

| Anahtar | Açıklama |
|---------|----------|
| `SECRET_KEY` | Uzun rastgele anahtar |
| `MASTER_ADMIN_PASSWORD` | Admin şifresi |
| `DATABASE_URL` | `sqlite:///./data/affiliate.db` |
| `CORS_ORIGINS` | Frontend domainleri |
| `CASINOPERA_SESSION_FILE` | `data/platform.cookie` |

---

## Vercel (opsiyonel)

Root Directory: `frontend`  
Env: `VITE_API_URL=<backend-url>`  
Detay: [VERCEL.md](./VERCEL.md)

---

## Cloudflare / özel domain

DNS A kaydı → sunucu IP. Nginx ile 443 → 8000 proxy önerilir.

Sağlık kontrolü: `curl http://localhost:8000/api/health`
