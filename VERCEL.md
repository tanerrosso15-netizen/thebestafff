# Vercel (Sadece Arayüz)

Vercel Python backend çalıştırmaz. Tam panel için sunucu deploy kullanın.

---

## Vercel ayarları

| Ayar | Değer |
|------|--------|
| Root Directory | `frontend` veya boş (kök `vercel.json`) |
| Env | `VITE_API_URL` = backend URL |

Env ekledikten sonra **Redeploy** gerekir.

Deployment Protection test için kapalı olmalı (401 verir).

---

## Doğru akış

```
Tarayıcı → Vercel (React) → VITE_API_URL → Sunucu (FastAPI :8000)
```

### Backend (VPS)

```bash
git clone <repository-url>
cd affiliate-panel
./deploy.sh
```

### Vercel

`VITE_API_URL` = backend adresi  
Backend `.env`: `CORS_ORIGINS=https://your-app.vercel.app`

---

## Tek adres istiyorsanız

Vercel kullanmayın — sadece `./deploy.sh` → `http://SUNUCU-IP:8000`
