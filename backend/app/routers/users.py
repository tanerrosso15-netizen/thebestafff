"""Kullanıcı yönetimi (Kullanıcı Listesi + Yetkilendirme)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_permission, require_superadmin
from app.models import Affiliate, PermissionGroup, User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import hash_password
from app.services.referral import generate_btag

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_out(db: Session, u: User) -> UserOut:
    out = UserOut.model_validate(u)
    aff = db.query(Affiliate).filter(Affiliate.user_id == u.id).first()
    out.affiliate_id = aff.id if aff else None
    if u.permission_group_id:
        grp = db.query(PermissionGroup).filter(PermissionGroup.id == u.permission_group_id).first()
        out.permission_group_name = grp.name if grp else None
    return out


@router.get("", response_model=list[UserOut])
def list_users(user: User = Depends(require_permission("users", "view")), db: Session = Depends(get_db)):
    rows = db.query(User).order_by(User.created_at.desc()).all()
    return [_to_out(db, u) for u in rows]


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate, user: User = Depends(require_permission("users", "edit")), db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı.")
    if payload.role in ("staff", "manager") and not payload.permission_group_id:
        raise HTTPException(status_code=400, detail="Personel kullanıcı için yetki grubu seçin.")
    if payload.role == "staff" and payload.permission_group_id:
        grp = db.query(PermissionGroup).filter(PermissionGroup.id == payload.permission_group_id).first()
        if not grp:
            raise HTTPException(status_code=400, detail="Yetki grubu bulunamadı.")
    new_user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        permission_group_id=payload.permission_group_id,
        is_active=payload.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Affiliate rolündeyse otomatik affiliate kaydı + referans linki oluştur
    if payload.role == "affiliate":
        btag = (payload.btag or "").strip() or generate_btag(db, payload.name)
        parent_id = None
        if payload.parent_btag:
            parent = db.query(Affiliate).filter(Affiliate.btag == payload.parent_btag.strip()).first()
            parent_id = parent.id if parent else None
        aff = Affiliate(
            name=payload.name,
            email=payload.email.lower(),
            btag=btag,
            commission_rate=payload.commission_rate or 25.0,
            group_id=payload.group_id,
            parent_id=parent_id,
            user_id=new_user.id,
            is_active=payload.is_active,
        )
        db.add(aff)
        db.commit()
    return _to_out(db, new_user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    user: User = Depends(require_permission("users", "edit")),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        target.password_hash = hash_password(data.pop("password"))
    else:
        data.pop("password", None)
    if "email" in data and data["email"]:
        data["email"] = data["email"].lower()
    for k, v in data.items():
        setattr(target, k, v)
    db.commit()
    db.refresh(target)
    return _to_out(db, target)


@router.patch("/{user_id}/toggle", response_model=UserOut)
def toggle_user(
    user_id: int, user: User = Depends(require_permission("users", "edit")), db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return _to_out(db, target)


@router.delete("/{user_id}")
def delete_user(
    user_id: int, user: User = Depends(require_permission("users", "delete")), db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz.")
    db.query(Affiliate).filter(Affiliate.user_id == user_id).update({Affiliate.user_id: None})
    db.delete(target)
    db.commit()
    return {"ok": True}
