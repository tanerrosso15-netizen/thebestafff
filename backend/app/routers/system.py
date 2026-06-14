"""Sistem ayarları + senkronizasyon + entegrasyon durumu."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.integrations.casinopera import CasinoOperaClient, load_cookie, save_cookie_file
from app.models import User
from app.schemas import CookieUpdate, SettingItem
from app.services.settings_store import get_setting, set_setting
from app.services.sync_service import run_sync

router = APIRouter(prefix="/api/system", tags=["system"])

_PUBLIC_KEYS = ("referral_base_url", "brand_name", "site_name")


@router.get("/settings")
def get_settings(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "brand_name": get_setting(db, "brand_name", settings.brand_name),
        "site_name": get_setting(db, "site_name", settings.site_name),
        "referral_base_url": get_setting(db, "referral_base_url", settings.referral_base_url),
        "affiliate_domain": get_setting(db, "affiliate_domain", ""),
        "panel_login_url": get_setting(db, "panel_login_url", "/login"),
        "landing_title": get_setting(db, "landing_title", "Affiliate Ortaklık Programı"),
        "landing_subtitle": get_setting(db, "landing_subtitle", "Kazançlarınızı tek panelden yönetin"),
        "landing_description": get_setting(
            db,
            "landing_description",
            "Referans linkinizle oyuncu getirin, komisyon kazanın.",
        ),
        "landing_cta": get_setting(db, "landing_cta", "Panele Giriş Yap"),
        "landing_highlight": get_setting(db, "landing_highlight", "Gerçek zamanlı komisyon takibi"),
        "sync_interval_seconds": settings.sync_interval_seconds,
        "sync_enabled": settings.sync_enabled,
        "site_id": settings.casinopera_site_id,
        "cookie_configured": bool(load_cookie(db)),
    }


@router.put("/settings")
def update_settings(
    items: list[SettingItem],
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    for item in items:
        set_setting(db, item.key, item.value)
    return {"ok": True}


@router.put("/cookie")
def update_cookie(
    payload: CookieUpdate, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    set_setting(db, "casinopera_cookie", payload.cookie)
    save_cookie_file(payload.cookie)
    return {"ok": True, "configured": bool(payload.cookie.strip())}


@router.get("/integration/status")
async def integration_status(
    user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    cookie = load_cookie(db)
    client = CasinoOperaClient(cookie)
    probe = await client.probe()
    return {
        "site_name": settings.site_name,
        "site_id": settings.casinopera_site_id,
        "base_url": settings.casinopera_base_url,
        **probe,
    }


@router.post("/sync")
async def trigger_sync(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return await run_sync(db)


@router.get("/branding")
def branding(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Tüm roller için marka bilgisi (header için)."""
    return {
        "brand_name": get_setting(db, "brand_name", settings.brand_name),
        "site_name": get_setting(db, "site_name", settings.site_name),
        "panel_title": settings.panel_title,
    }
