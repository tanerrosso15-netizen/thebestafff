"""Admin ↔ Affiliate canlı destek / mesajlaşma — metin + resim."""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Affiliate, Message, User
from app.schemas import MessageOut, ThreadOut

router = APIRouter(prefix="/api/messages", tags=["messages"])

UPLOAD_DIR = Path("data/uploads")
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _own_affiliate(db: Session, user: User) -> Affiliate | None:
    return db.query(Affiliate).filter(Affiliate.user_id == user.id).first()


def _is_admin(user: User) -> bool:
    return user.role in ("admin", "manager")


@router.get("/threads", response_model=list[ThreadOut])
def list_threads(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Admin: tüm affiliate konuşmaları. Affiliate: kendi tek thread'i."""
    threads: list[ThreadOut] = []
    if _is_admin(user):
        affs = db.query(Affiliate).order_by(Affiliate.name).all()
    else:
        own = _own_affiliate(db, user)
        affs = [own] if own else []

    for aff in affs:
        if not aff:
            continue
        last = (
            db.query(Message)
            .filter(Message.affiliate_id == aff.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        if _is_admin(user):
            unread = (
                db.query(func.count(Message.id))
                .filter(
                    Message.affiliate_id == aff.id,
                    Message.sender_role == "affiliate",
                    Message.is_read.is_(False),
                )
                .scalar()
            )
        else:
            unread = (
                db.query(func.count(Message.id))
                .filter(
                    Message.affiliate_id == aff.id,
                    Message.sender_role.in_(("admin", "manager")),
                    Message.is_read.is_(False),
                )
                .scalar()
            )
        # Admin için yalnızca konuşma başlamış olanları öne al ama hepsini göster
        threads.append(
            ThreadOut(
                affiliate_id=aff.id,
                affiliate_name=aff.name,
                btag=aff.btag,
                last_message=(last.body if last else "") or ("[resim]" if last else ""),
                last_at=last.created_at if last else None,
                unread=int(unread or 0),
            )
        )
    # Son mesaja göre sırala (mesajı olanlar üstte)
    threads.sort(key=lambda t: (t.last_at is not None, t.last_at or 0), reverse=True)
    return threads


@router.get("", response_model=list[MessageOut])
def list_messages(
    affiliate_id: int | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _is_admin(user):
        if affiliate_id is None:
            raise HTTPException(status_code=400, detail="affiliate_id gerekli.")
        aff_id = affiliate_id
    else:
        own = _own_affiliate(db, user)
        if not own:
            return []
        aff_id = own.id

    msgs = (
        db.query(Message)
        .filter(Message.affiliate_id == aff_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    # Karşı tarafın mesajlarını okundu işaretle
    if _is_admin(user):
        for m in msgs:
            if m.sender_role == "affiliate" and not m.is_read:
                m.is_read = True
    else:
        for m in msgs:
            if m.sender_role in ("admin", "manager") and not m.is_read:
                m.is_read = True
    db.commit()
    return msgs


@router.post("", response_model=MessageOut)
async def send_message(
    affiliate_id: int | None = Form(None),
    body: str = Form(""),
    image: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _is_admin(user):
        if affiliate_id is None:
            raise HTTPException(status_code=400, detail="affiliate_id gerekli.")
        aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
        sender_role = "admin"
    else:
        aff = _own_affiliate(db, user)
        sender_role = "affiliate"
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")

    image_path = ""
    if image is not None and image.filename:
        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(status_code=400, detail="Desteklenmeyen resim türü.")
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        fname = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / fname
        content = await image.read()
        dest.write_bytes(content)
        image_path = f"/uploads/{fname}"

    if not body.strip() and not image_path:
        raise HTTPException(status_code=400, detail="Boş mesaj gönderilemez.")

    msg = Message(
        affiliate_id=aff.id,
        sender_role=sender_role,
        sender_user_id=user.id,
        sender_name=user.name,
        body=body.strip(),
        image_path=image_path,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
