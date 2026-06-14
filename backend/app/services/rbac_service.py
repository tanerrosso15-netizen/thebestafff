"""RBAC yardımcıları — kullanıcı yetkilerini çöz."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import PermissionGroup, User
from app.rbac import full_permissions, normalize_permissions


def get_permissions_for_user(db: Session, user: User) -> dict[str, dict[str, bool]]:
    if user.role == "admin":
        return full_permissions()
    if user.role == "affiliate":
        return {}
    if user.permission_group_id:
        grp = db.query(PermissionGroup).filter(PermissionGroup.id == user.permission_group_id).first()
        if grp:
            return normalize_permissions(grp.permissions)
    return {}


def has_permission(
    db: Session, user: User, module: str, action: str = "view"
) -> bool:
    if user.role == "admin":
        return True
    if user.role == "affiliate":
        return False
    perms = get_permissions_for_user(db, user)
    mod = perms.get(module) or {}
    return bool(mod.get(action))
