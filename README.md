# PQP Affiliate Panel

CasinoPera (Lynon) için **referans linki tabanlı affiliate yönetim paneli**.  
Python (FastAPI) + React (Vite) + SQLite.

**Repo:** https://github.com/tannertt82-ux/thebestaff

---

## Sunucuda ayağa kaldırma (VPS)

```bash
git clone https://github.com/tannertt82-ux/thebestaff.git
cd thebestaff
cp backend/.env.example backend/.env
# backend/.env düzenle (SECRET_KEY, şifre)
docker compose up -d --build
```

Panel: **http://SUNUCU-IP:8000**  
Detay: [DEPLOY.md](./DEPLOY.md)

---

## Windows (local)

```bat
start.bat
```

Panel: **http://localhost:8000**  
Giriş: `admin@panel.com` / `.env` içindeki şifre

---

## Özellikler

- **Admin paneli**: Gösterge Paneli, Affiliate Listesi/Grupları, Raporlar, Oyuncular, Çekim İstekleri, Aktiviteler, Kullanıcılar, Yetkilendirme, Sistem Ayarları.
- **Affiliate paneli**: kendi gösterge paneli, referans linkleri, alt affiliateler, oyuncuları, çekim istekleri.
- **Referans linki sistemi**: her affiliate'e benzersiz `btag` → link üzerinden gelen oyuncular otomatik affiliate'e bağlanır.
- **Çok kademeli (multi-level)**: bir affiliate başka affiliate getirebilir (`parent_btag`).
- **CasinoPera entegrasyonu**: cookie ile backoffice'ten oyuncu verisi çekme + **periyodik dinamik senkronizasyon** (varsayılan 5 dk).
- **SQL fallback**: cookie yoksa panel yerel veriyle (demo dahil) tam çalışır.

## Hızlı Başlangıç (tek komut)

```bat
start.bat
```

İlk çalıştırmada sanal ortamı kurar, frontend'i derler ve sunucuyu başlatır:

- Panel: **http://localhost:8000**
- Giriş (admin): `admin@panel.com` / `ordinarman34.`
- Demo affiliate girişi: `seo3@example.com` / `affiliate123`

## Geliştirme Modu

```bat
dev.bat
```

- Backend (API): http://localhost:8000  (otomatik reload)
- Frontend (Vite): http://localhost:5173 (API'ye proxy)

## Manuel Kurulum

**Backend**
```powershell
cd backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Frontend**
```powershell
cd frontend
npm install
npm run dev      # geliştirme
npm run build    # production (backend otomatik servis eder)
```

## CasinoPera Bağlantısı

1. Panelde **Sistem Ayarları → CasinoPera Entegrasyonu**'na gidin.
2. Backoffice oturum cookie'sini yapıştırıp kaydedin (veya `backend/data/casinopera.cookie` dosyasına yazın).
3. **Şimdi Senkronize Et** ile test edin. Sonrasında veriler periyodik olarak güncellenir.

Cookie geçerli olduğunda gerçek oyuncular `btag` üzerinden affiliatelere bağlanır.

## Referans Akışı

1. Admin, **Kullanıcılar** veya **Affiliate Listesi**'nden bir affiliate oluşturur → otomatik `btag` ve giriş hesabı üretilir.
2. Affiliate kendi panelinden referans linkini alır:
   - Doğrudan: `https://www.casinopera.com/?btag=<btag>`
   - İzlenebilir (tıklama sayar): `http://<panel>/r/<btag>`
3. Link üzerinden gelen oyuncular CasinoPera'ya `btag` ile kaydolur.
4. Senkronizasyon oyuncuları `btag` eşleşmesiyle affiliate'e bağlar; komisyon ve istatistikler panele yansır.

## Yapılandırma (`backend/.env`)

| Anahtar | Açıklama |
|--------|----------|
| `MASTER_ADMIN_EMAIL/PASSWORD` | İlk admin hesabı |
| `REFERRAL_BASE_URL` | Referans linki kök adresi |
| `CASINOPERA_SITE_ID` | Site kimliği (varsayılan 125) |
| `CASINOPERA_SESSION_FILE` | Cookie dosyası yolu |
| `SYNC_INTERVAL_SECONDS` | Periyodik senkron aralığı |
| `SEED_DEMO_DATA` | İlk açılışta demo veri üret |

## MongoDB Geçişi (sonra)

DB erişimi servis katmanında soyutlandı. MongoDB eklenince:
`DATABASE_URL` yerine Mongo adaptörü yazılır; modeller/şemalar aynı kalır.
```
