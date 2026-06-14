# Deploy Rehberi — Git + Sunucu (VPS)

Backend **Heroku/Render yerine kendi sunucunuzda** çalışır. Repo’yu clone edip tek komutla ayağa kaldırırsınız.

| Bileşen | Nerede |
|---------|--------|
| **Tam panel** (API + arayüz) | Kendi VPS / sunucu — `docker compose` veya `./start.sh` |
| **Sadece arayüz** (opsiyonel) | Vercel — `frontend/` klasörü |

---

## Hızlı başlangıç (sunucuda)

```bash
git clone https://github.com/tanerrosso15-netizen/thebestafff.git
cd thebestaff
cp backend/.env.example backend/.env
nano backend/.env          # SECRET_KEY, şifre, CORS_ORIGINS düzenleyin
chmod +x install.sh start.sh
./install.sh               # ilk kurulum (bir kez)
./start.sh                 # panel: http://SUNUCU-IP:8000
```

**Giriş:** `admin@panel.com` / `.env` içindeki şifre

---

## Docker (önerilen — production)

```bash
git clone https://github.com/tanerrosso15-netizen/thebestafff.git
cd thebestaff
cp backend/.env.example backend/.env
nano backend/.env

docker compose up -d --build
docker compose logs -f
```

- Panel: `http://SUNUCU-IP:8000`
- Veritabanı + yüklemeler: Docker volume `affiliate-data` (kalıcı)
- Güncelleme: `git pull && docker compose up -d --build`

Port değiştirmek: `.env` yanına kökte `PORT=9000` veya `PORT=9000 docker compose up -d`

---

## Güncelleme akışı (sizin workflow)

1. Geliştirme yapılır (local)
2. Bana “repo et” dediğinizde → push yapılır
3. Sunucuda:

```bash
cd thebestaff
git pull
docker compose up -d --build
# veya Docker yoksa: ./start.sh
```

---

## Ortam değişkenleri (`backend/.env`)

| Anahtar | Açıklama |
|---------|----------|
| `SECRET_KEY` | Uzun rastgele JWT anahtarı (production’da mutlaka değiştirin) |
| `MASTER_ADMIN_PASSWORD` | Admin giriş şifresi |
| `DATABASE_URL` | `sqlite:///./data/pqp_affiliate.db` (varsayılan) |
| `CORS_ORIGINS` | Frontend domainleri (Vercel kullanıyorsanız ekleyin) |
| `SEED_DEMO_DATA` | `false` — gerçek ortam |
| `CASINOPERA_SESSION_FILE` | Cookie dosyası: `data/casinopera.cookie` |

Cookie: backoffice oturumunu `backend/data/casinopera.cookie` dosyasına yapıştırın veya panelden kaydedin.

---

## Vercel (opsiyonel — sadece frontend)

Backend ayrı sunucudaysa Vercel’de:

| Ayar | Değer |
|------|--------|
| Root Directory | `frontend` |
| Build | `npm run build` |
| Output | `dist` |
| Env | `VITE_API_URL=https://api.sizindomain.com` |

Backend aynı sunucudaysa Vercel gerekmez — `docker compose` her şeyi sunar.

---

## Cloudflare DNS

| Kayıt | Hedef |
|-------|--------|
| `aff.domain.com` | Sunucu IP (A kaydı) veya Vercel CNAME |
| `api.domain.com` | Sunucu IP:8000 (nginx reverse proxy önerilir) |

Nginx örneği (443 → 8000):

```nginx
server {
    listen 443 ssl;
    server_name aff.domain.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Panel ayarlarında **Affiliate Domaini** ve **Panel Giriş URL** alanlarını kendi domaininize göre doldurun.

---

## Sağlık kontrolü

```bash
curl http://localhost:8000/api/health
# {"status":"ok","brand":"PQP"}
```

---

## Windows (local geliştirme)

```bat
start.bat
```

Panel: http://localhost:8000
