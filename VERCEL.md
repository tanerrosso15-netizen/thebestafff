# Vercel Kurulumu (Sadece Arayüz)

> **Önemli:** Vercel Python backend çalıştırmaz.  
> Vercel = sadece React arayüzü. API için ayrı sunucu (VPS + Docker) gerekir.

---

## Ne görüyorsunuz?

Vercel deploy **Ready** = arayüz dosyaları yüklendi.  
Bu, panelin **tam çalıştığı** anlamına gelmez — login ve veriler **backend API** ister.

| Adres | Ne |
|-------|-----|
| `*.vercel.app` | Sadece frontend (React) |
| Backend API | VPS’te `docker compose` veya başka sunucu |

---

## Vercel ayarları (Project Settings)

1. **General → Root Directory**  
   - `frontend` seçin **VEYA** boş bırakın (kök `vercel.json` halleder)

2. **Environment Variables** (Production):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | Backend URL’niz, örn. `https://api.sizindomain.com` veya `http://SUNUCU-IP:8000` |

3. **Deployments → Redeploy** (env ekledikten sonra zorunlu)

4. **Deployment Protection** kapalı olsun (401 verir):
   - Settings → Deployment Protection → Production → **Off** (test için)

---

## Doğru akış (2 parça)

```
Tarayıcı → Vercel (React)  →  VITE_API_URL  →  VPS (FastAPI :8000)
```

### Adım A — Backend (VPS, SSH)

```bash
git clone https://github.com/tanerrosso15-netizen/thebestafff.git
cd thebestafff
chmod +x deploy.sh
./deploy.sh
```

Backend adresi örnek: `http://185.x.x.x:8000`  
Test: `curl http://185.x.x.x:8000/api/health`

### Adım B — Vercel

- `VITE_API_URL` = `http://185.x.x.x:8000` (HTTPS backend varsa onu kullanın)
- Redeploy
- `backend/.env` içinde: `CORS_ORIGINS=https://project-xofix-....vercel.app`

---

## Sadece Vercel kullanmak istemiyorsanız (tek link)

Vercel’i kapatın, sadece VPS:

```bash
./deploy.sh
```

Panel: `http://SUNUCU-IP:8000` — hem arayüz hem API aynı adreste.

---

## Sizin deploy bilgisi

- **Commit:** `b12be7f` — eski; `git pull` ile `2de95fb+` alın
- **Domain:** `project-xofix-....vercel.app`
- **401 Unauthorized:** Deployment Protection açık olabilir

Son commit’i almak için Vercel → Deployments → **Redeploy** veya GitHub’a yeni push.
