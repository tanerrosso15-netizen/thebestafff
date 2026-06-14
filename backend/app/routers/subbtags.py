"""Alt btag yönetimi — affiliate kendi alt btag'lerini oluşturur, tek panelden raporlanır."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Affiliate, SubBtag, User
from app.schemas import SubBtagCreate, SubBtagOut
from app.services.settings_store import build_referral_link

router = APIRouter(prefix="/api/subbtags", tags=["subbtags"])


def _own_affiliate(db: Session, user: User) -> Affiliate | None:
    return db.query(Affiliate).filter(Affiliate.user_id == user.id).first()


def _to_out(db: Session, s: SubBtag) -> SubBtagOut:
    out = SubBtagOut.model_validate(s)
    out.referral_link = build_referral_link(db, s.btag)
    return out


@router.get("", response_model=list[SubBtagOut])
def list_subbtags(
    affiliate_id: int | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role in ("admin", "manager"):
        q = db.query(SubBtag)
        if affiliate_id is not None:
            q = q.filter(SubBtag.affiliate_id == affiliate_id)
    else:
        own = _own_affiliate(db, user)
        if not own:
            return []
        q = db.query(SubBtag).filter(SubBtag.affiliate_id == own.id)
    return [_to_out(db, s) for s in q.order_by(SubBtag.created_at.desc()).all()]


@router.post("", response_model=SubBtagOut)
def create_subbtag(
    payload: SubBtagCreate,
    affiliate_id: int | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role in ("admin", "manager"):
        if affiliate_id is None:
            raise HTTPException(status_code=400, detail="affiliate_id gerekli.")
        aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    else:
        aff = _own_affiliate(db, user)
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")

    suffix = re.sub(r"[^a-zA-Z0-9]", "", (payload.suffix or "")).lower()
    if not suffix:
        raise HTTPException(status_code=400, detail="Geçerli bir son ek girin.")
    btag = f"{aff.btag}_{suffix}"
    if (
        db.query(SubBtag).filter(SubBtag.btag == btag).first()
        or db.query(Affiliate).filter(Affiliate.btag == btag).first()
    ):
        raise HTTPException(status_code=400, detail="Bu alt btag zaten var.")

    sub = SubBtag(affiliate_id=aff.id, btag=btag, label=payload.label or suffix)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _to_out(db, sub)


@router.delete("/{sub_id}")
def delete_subbtag(
    sub_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    sub = db.query(SubBtag).filter(SubBtag.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Alt btag bulunamadı.")
    if user.role not in ("admin", "manager"):
        own = _own_affiliate(db, user)
        if not own or sub.affiliate_id != own.id:
            raise HTTPException(status_code=403, detail="Yetkiniz yok.")
    db.delete(sub)
    db.commit()
    return {"ok": True}
