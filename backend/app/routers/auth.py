"""Kimlik doğrulama — login, me."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Affiliate, User
from app.schemas import LoginRequest, MeResponse, TokenResponse
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya parola hatalı.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hesabınız pasif durumda.")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    token = create_access_token(subject=str(user.id), role=user.role)
    return TokenResponse(
        access_token=token, role=user.role, name=user.name, email=user.email
    )


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    aff = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
    return MeResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        affiliate_id=aff.id if aff else None,
        btag=aff.btag if aff else None,
    )
