"""Anahtar/değer ayar deposu — DB üzerinden, .env varsayılanları ile."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Setting


def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row and row.value:
        return row.value
    return default


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))
    db.commit()


def referral_base_url(db: Session) -> str:
    return get_setting(db, "referral_base_url", settings.referral_base_url)


def affiliate_domain(db: Session) -> str:
    """Sitenin verdiği affiliate yönlendirme domaini. Boşsa casino tabanı kullanılır."""
    return get_setting(db, "affiliate_domain", "")


def build_referral_link(db: Session, btag: str) -> str:
    """Doğrudan referans linki — aff domaini varsa onu, yoksa casino tabanını kullanır."""
    base = (affiliate_domain(db) or referral_base_url(db)).rstrip("/")
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}btag={btag}"
