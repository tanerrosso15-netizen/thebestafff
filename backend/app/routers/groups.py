"""Affiliate grupları."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Affiliate, AffiliateGroup, User
from app.schemas import GroupCreate, GroupOut, GroupUpdate

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _to_out(db: Session, g: AffiliateGroup) -> GroupOut:
    out = GroupOut.model_validate(g)
    out.affiliate_count = int(
        db.query(func.count(Affiliate.id)).filter(Affiliate.group_id == g.id).scalar() or 0
    )
    return out


@router.get("", response_model=list[GroupOut])
def list_groups(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(AffiliateGroup).order_by(AffiliateGroup.created_at.desc()).all()
    return [_to_out(db, g) for g in rows]


@router.post("", response_model=GroupOut)
def create_group(
    payload: GroupCreate, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    g = AffiliateGroup(**payload.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return _to_out(db, g)


@router.put("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int,
    payload: GroupUpdate,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    g = db.query(AffiliateGroup).filter(AffiliateGroup.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grup bulunamadı.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    db.commit()
    db.refresh(g)
    return _to_out(db, g)


@router.delete("/{group_id}")
def delete_group(
    group_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    g = db.query(AffiliateGroup).filter(AffiliateGroup.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grup bulunamadı.")
    db.query(Affiliate).filter(Affiliate.group_id == group_id).update({Affiliate.group_id: None})
    db.delete(g)
    db.commit()
    return {"ok": True}
