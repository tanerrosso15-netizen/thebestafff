"""RBAC — menü modülleri ve yetki anahtarları."""
from __future__ import annotations

MODULES: list[dict[str, str]] = [
    {"key": "dashboard", "label": "Gösterge Paneli"},
    {"key": "affiliates", "label": "Affiliate Listesi"},
    {"key": "affiliate_groups", "label": "Affiliate Grupları"},
    {"key": "reports", "label": "Raporlar"},
    {"key": "players", "label": "Oyuncular"},
    {"key": "withdrawals", "label": "Çekim İstekleri"},
    {"key": "messages", "label": "Mesajlar"},
    {"key": "activities", "label": "Aktiviteler"},
    {"key": "users", "label": "Kullanıcılar"},
    {"key": "permissions", "label": "Yetkilendirme"},
    {"key": "settings", "label": "Sistem Ayarları"},
    {"key": "merchants", "label": "Merchant Bilgileri"},
]

ACTIONS = ("view", "edit", "delete")


def empty_permissions() -> dict[str, dict[str, bool]]:
    return {m["key"]: {"view": False, "edit": False, "delete": False} for m in MODULES}


def full_permissions() -> dict[str, dict[str, bool]]:
    return {m["key"]: {"view": True, "edit": True, "delete": True} for m in MODULES}


def normalize_permissions(raw: dict | None) -> dict[str, dict[str, bool]]:
    base = empty_permissions()
    if not raw:
        return base
    for mod in MODULES:
        key = mod["key"]
        entry = raw.get(key) or {}
        if isinstance(entry, dict):
            base[key] = {
                "view": bool(entry.get("view")),
                "edit": bool(entry.get("edit")),
                "delete": bool(entry.get("delete")),
            }
    return base
