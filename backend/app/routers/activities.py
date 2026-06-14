"""Aktiviteler."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Activity, Affiliate, User
from app.schemas import ActivityOut

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("", response_model=list[ActivityOut])
def list_activities(
    limit: int = Query(50, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Activity)
    if user.role == "affiliate":
        own = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
        if not own:
            return []
        query = query.filter(Activity.affiliate_id == own.id)
    return query.order_by(Activity.created_at.desc()).limit(limit).all()
