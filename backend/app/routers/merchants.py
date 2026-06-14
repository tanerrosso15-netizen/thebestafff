"""Merchant yapılandırması — fetcher, domain, altyapı."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_permission
from app.models import Merchant, User
from app.schemas import MerchantCreate, MerchantOut, MerchantUpdate
from app.services.settings_store import set_setting

router = APIRouter(prefix="/api/merchants", tags=["merchants"])


def _apply_merchant_to_settings(db: Session, m: Merchant) -> None:
    """Aktif merchant ayarlarını panel settings'e yansıt."""
    if not m.is_active:
        return
    if m.active_domain:
        set_setting(db, "referral_base_url", m.active_domain.rstrip("/") + "/")
    if m.active_affiliate_domain:
        set_setting(db, "affiliate_domain", m.active_affiliate_domain.rstrip("/") + "/")
    if m.backoffice_url:
        set_setting(db, "casinopera_base_url", m.backoffice_url.rstrip("/"))
    if m.site_id:
        set_setting(db, "casinopera_site_id", m.site_id)
    if m.fetcher_email:
        set_setting(db, "fetcher_email", m.fetcher_email)
    if m.fetcher_password:
        set_setting(db, "fetcher_password", m.fetcher_password)
    if m.fetcher_otp_secret:
        set_setting(db, "fetcher_otp_secret", m.fetcher_otp_secret)


@router.get("", response_model=list[MerchantOut])
def list_merchants(
    _: User = Depends(require_permission("merchants", "view")),
    db: Session = Depends(get_db),
):
    return db.query(Merchant).order_by(Merchant.created_at.desc()).all()


@router.get("/active", response_model=MerchantOut | None)
def active_merchant(
    _: User = Depends(require_permission("merchants", "view")),
    db: Session = Depends(get_db),
):
    return db.query(Merchant).filter(Merchant.is_active.is_(True)).first()


@router.post("", response_model=MerchantOut)
def create_merchant(
    payload: MerchantCreate,
    _: User = Depends(require_permission("merchants", "edit")),
    db: Session = Depends(get_db),
):
    if payload.is_active:
        db.query(Merchant).update({Merchant.is_active: False})
    m = Merchant(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    _apply_merchant_to_settings(db, m)
    db.commit()
    return m


@router.put("/{merchant_id}", response_model=MerchantOut)
def update_merchant(
    merchant_id: int,
    payload: MerchantUpdate,
    _: User = Depends(require_permission("merchants", "edit")),
    db: Session = Depends(get_db),
):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Merchant bulunamadı.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("is_active"):
        db.query(Merchant).filter(Merchant.id != merchant_id).update({Merchant.is_active: False})
    for k, v in data.items():
        setattr(m, k, v)
    m.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(m)
    _apply_merchant_to_settings(db, m)
    db.commit()
    return m


@router.delete("/{merchant_id}")
def delete_merchant(
    merchant_id: int,
    _: User = Depends(require_permission("merchants", "delete")),
    db: Session = Depends(get_db),
):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Merchant bulunamadı.")
    db.delete(m)
    db.commit()
    return {"ok": True}
