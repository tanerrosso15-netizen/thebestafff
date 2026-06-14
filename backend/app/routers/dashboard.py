"""Gösterge paneli — admin ve affiliate görünümleri."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Affiliate, User
from app.services.dashboard_service import admin_dashboard, affiliate_dashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role in ("admin", "manager"):
        return {"scope": "admin", **admin_dashboard(db)}
    aff = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate kaydı bulunamadı.")
    return {"scope": "affiliate", **affiliate_dashboard(db, aff)}
