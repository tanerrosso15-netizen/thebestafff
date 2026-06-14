"""Bağımlılıklar — geçerli kullanıcı, rol kontrolü."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token
from app.services.rbac_service import has_permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def require_permission(module: str, action: str = "view"):
    """Menü modülü için view/edit/delete yetkisi."""

    def _dep(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if user.role == "admin":
            return user
        if user.role == "affiliate":
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok.")
        if not has_permission(db, user, module, action):
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok.")
        return user

    return _dep


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş oturum.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise cred_exc
    payload = decode_token(token)
    if not payload:
        raise cred_exc
    sub = payload.get("sub")
    if not sub:
        raise cred_exc
    user = db.query(User).filter(User.id == int(sub)).first()
    if not user or not user.is_active:
        raise cred_exc
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role == "admin":
        return user
    if user.role in ("manager", "staff"):
        return user
    raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekir.")


def require_staff(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if user.role in ("admin", "manager", "staff"):
        return user
    if user.role == "affiliate":
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekir.")
    raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekir.")


def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekir.")
    return user
