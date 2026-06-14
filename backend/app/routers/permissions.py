"""Yetki grubu CRUD."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_permission
from app.models import PermissionGroup, User
from app.rbac import MODULES, normalize_permissions
from app.schemas import PermissionGroupCreate, PermissionGroupOut, PermissionGroupUpdate

router = APIRouter(prefix="/api/permissions", tags=["permissions"])


@router.get("/modules")
def list_modules(_: User = Depends(require_permission("permissions", "view"))):
    return {"modules": MODULES}


@router.get("", response_model=list[PermissionGroupOut])
def list_groups(
    _: User = Depends(require_permission("permissions", "view")),
    db: Session = Depends(get_db),
):
    return db.query(PermissionGroup).order_by(PermissionGroup.name).all()


@router.post("", response_model=PermissionGroupOut)
def create_group(
    payload: PermissionGroupCreate,
    _: User = Depends(require_permission("permissions", "edit")),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Yetki adı gerekli.")
    if db.query(PermissionGroup).filter(PermissionGroup.name == name).first():
        raise HTTPException(status_code=400, detail="Bu yetki adı zaten var.")
    grp = PermissionGroup(
        name=name,
        permissions=normalize_permissions(payload.permissions),
    )
    db.add(grp)
    db.commit()
    db.refresh(grp)
    return grp


@router.put("/{group_id}", response_model=PermissionGroupOut)
def update_group(
    group_id: int,
    payload: PermissionGroupUpdate,
    _: User = Depends(require_permission("permissions", "edit")),
    db: Session = Depends(get_db),
):
    grp = db.query(PermissionGroup).filter(PermissionGroup.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Yetki grubu bulunamadı.")
    if grp.is_system and payload.name and payload.name.strip() != grp.name:
        raise HTTPException(status_code=400, detail="Sistem grubu yeniden adlandırılamaz.")
    if payload.name is not None:
        name = payload.name.strip()
        clash = (
            db.query(PermissionGroup)
            .filter(PermissionGroup.name == name, PermissionGroup.id != group_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=400, detail="Bu yetki adı zaten var.")
        grp.name = name
    if payload.permissions is not None:
        grp.permissions = normalize_permissions(payload.permissions)
    db.commit()
    db.refresh(grp)
    return grp


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    _: User = Depends(require_permission("permissions", "delete")),
    db: Session = Depends(get_db),
):
    grp = db.query(PermissionGroup).filter(PermissionGroup.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Yetki grubu bulunamadı.")
    if grp.is_system:
        raise HTTPException(status_code=400, detail="Sistem grubu silinemez.")
    in_use = db.query(User).filter(User.permission_group_id == group_id).count()
    if in_use:
        raise HTTPException(status_code=400, detail="Bu gruba bağlı kullanıcı var.")
    db.delete(grp)
    db.commit()
    return {"ok": True}
