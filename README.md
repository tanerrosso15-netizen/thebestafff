# Affiliate Management Panel

Referans linki tabanlı affiliate yönetim sistemi.  
Python (FastAPI) + React (Vite) + SQLite.

---

## Sunucuda ayağa kaldırma

```bash
git clone <repository-url>
cd affiliate-panel
chmod +x deploy.sh diagnose.sh
./deploy.sh
```

Panel: **http://SUNUCU-IP:8000**

> Vercel yalnızca arayüz içindir — tam panel için sunucu deploy kullanın.  
> Detay: [DEPLOY.md](./DEPLOY.md) · [VERCEL.md](./VERCEL.md)

---

## Windows (local)

```bat
start.bat
```

Panel: **http://localhost:8000**  
Giriş bilgileri: `backend/.env` dosyasındaki `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD`

---

## Özellikler

- Admin paneli: dashboard, affiliate, raporlar, oyuncular, çekim, mesajlaşma, ayarlar
- Affiliate paneli: referans linkleri, alt btag, oyuncular, canlı destek
- Platform backoffice entegrasyonu (cookie + periyodik senkron)
- Docker ile tek komut deploy

---

## Yapılandırma

Tüm ayarlar `backend/.env` içinde. Örnek: `backend/.env.example`

| Anahtar | Açıklama |
|---------|----------|
| `SECRET_KEY` | JWT güvenlik anahtarı |
| `MASTER_ADMIN_EMAIL/PASSWORD` | İlk admin |
| `BRAND_NAME` / `SITE_NAME` | Marka (panelden de düzenlenebilir) |
| `REFERRAL_BASE_URL` | Referans linki kök adresi |
| `CASINOPERA_*` | Platform backoffice API ayarları |
| `SEED_DEMO_DATA` | Demo veri (`false` önerilir) |

---

## Güncelleme

```bash
git pull
docker compose up -d --build
```

Detaylı deploy: [DEPLOY.md](./DEPLOY.md)
