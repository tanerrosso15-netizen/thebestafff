"""Referans (btag) kodu üretimi."""
from __future__ import annotations

import random
import re
import string

from sqlalchemy.orm import Session

from app.models import Affiliate

_ALPHABET = string.ascii_lowercase + string.digits


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9]", "", (name or "").lower())
    return base[:10] or "aff"


def generate_btag(db: Session, name: str = "") -> str:
    """Benzersiz btag üret — isim tabanlı, çakışırsa sayı ekler."""
    root = _slugify(name)
    candidate = root
    i = 0
    while db.query(Affiliate).filter(Affiliate.btag == candidate).first() is not None:
        i += 1
        suffix = "".join(random.choices(_ALPHABET, k=3))
        candidate = f"{root}{suffix}"
        if i > 50:
            candidate = "aff" + "".join(random.choices(_ALPHABET, k=8))
            break
    return candidate
