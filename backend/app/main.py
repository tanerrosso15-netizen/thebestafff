"""PQP Affiliate Panel — FastAPI uygulaması."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal, init_db
from app.routers import (
    activities,
    affiliates,
    auth,
    dashboard,
    groups,
    messages,
    players,
    public_api,
    referral,
    subbtags,
    system,
    users,
    withdrawals,
)
from app.scheduler import shutdown_scheduler, start_scheduler
from app.services.seed import run_seed
from app.services.sync_service import run_sync

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("pqp.affiliate")

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


async def _initial_sync():
    """Açılışta derin senkronu arka planda çalıştır — startup'ı bloklamaz."""
    db = SessionLocal()
    try:
        await run_sync(db, deep=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning("İlk senkron hatası: %s", exc)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
    start_scheduler()
    asyncio.create_task(_initial_sync())
    logger.info("PQP Affiliate Panel başladı.")
    yield
    shutdown_scheduler()


app = FastAPI(title="PQP Affiliate Panel", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth.router,
    dashboard.router,
    affiliates.router,
    groups.router,
    players.router,
    withdrawals.router,
    activities.router,
    users.router,
    system.router,
    referral.router,
    subbtags.router,
    messages.router,
    public_api.router,
):
    app.include_router(r)


# Yüklenen mesaj resimleri
_UPLOAD_DIR = Path("data/uploads")
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "brand": settings.brand_name}


# --- Frontend (production build varsa servis et) ---
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    _INDEX = FRONTEND_DIST / "index.html"

    @app.get("/")
    def spa_root():
        return FileResponse(_INDEX)

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith(("api/", "r/", "uploads/")):
            return FileResponse(_INDEX, status_code=404)
        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_INDEX)
