"""Herkese açık API — yönlendirme sayfası kişiselleştirmesi."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.settings_store import get_setting

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/landing")
def landing_config(db: Session = Depends(get_db)):
    """Statik affiliate yönlendirme sayfası ayarları (auth gerekmez)."""
    return {
        "brand_name": get_setting(db, "brand_name", settings.brand_name),
        "site_name": get_setting(db, "site_name", settings.site_name),
        "landing_title": get_setting(db, "landing_title", "Affiliate Ortaklık Programı"),
        "landing_subtitle": get_setting(
            db, "landing_subtitle", "Kazançlarınızı tek panelden yönetin"
        ),
        "landing_description": get_setting(
            db,
            "landing_description",
            "Referans linkinizle oyuncu getirin, komisyon kazanın. "
            "Gerçek zamanlı raporlar, alt kampanya takibi ve canlı destek.",
        ),
        "landing_cta": get_setting(db, "landing_cta", "Panele Giriş Yap"),
        "landing_highlight": get_setting(db, "landing_highlight", "Gerçek zamanlı komisyon takibi"),
        "panel_login_url": get_setting(db, "panel_login_url", "/login"),
    }
