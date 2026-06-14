"""Çekim istekleri."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Affiliate, Player, User, WithdrawalRequest
from app.schemas import WithdrawalOut, WithdrawalUpdate

router = APIRouter(prefix="/api/withdrawals", tags=["withdrawals"])


@router.get("", response_model=list[WithdrawalOut])
def list_withdrawals(
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(WithdrawalRequest)
    if user.role == "affiliate":
        own = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
        if not own:
            return []
        player_btags = [own.btag]
        query = query.filter(WithdrawalRequest.btag.in_(player_btags))
    if status:
        query = query.filter(WithdrawalRequest.status == status)
    return query.order_by(WithdrawalRequest.requested_at.desc()).all()


@router.put("/{wd_id}", response_model=WithdrawalOut)
def update_withdrawal(
    wd_id: int,
    payload: WithdrawalUpdate,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    wd = db.query(WithdrawalRequest).filter(WithdrawalRequest.id == wd_id).first()
    if not wd:
        raise HTTPException(status_code=404, detail="Çekim isteği bulunamadı.")
    wd.status = payload.status
    if payload.status in ("approved", "rejected"):
        wd.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wd)
    return wd
