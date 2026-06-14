"""Referans linki takibi (public) ve affiliate link bilgisi.

Akış: oyuncu affiliate linkine tıklar → /r/{btag} tıklamayı kaydeder →
gerçek casinopera adresine yönlendirir (?btag=...). Casinopera kaydı sonrası
oyuncu btag ile gelir ve senkronda affiliate'e bağlanır.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Affiliate, ReferralClick, SubBtag
from app.services.settings_store import build_referral_link

router = APIRouter(tags=["referral"])


@router.get("/r/{btag}")
def track_and_redirect(btag: str, request: Request, db: Session = Depends(get_db)):
    aff = db.query(Affiliate).filter(Affiliate.btag == btag).first()
    sub = None
    if not aff:
        sub = db.query(SubBtag).filter(SubBtag.btag == btag).first()
        if sub:
            aff = db.query(Affiliate).filter(Affiliate.id == sub.affiliate_id).first()

    click = ReferralClick(
        btag=btag,
        ip=request.client.host if request.client else "",
        user_agent=request.headers.get("user-agent", "")[:400],
        referer=request.headers.get("referer", "")[:400],
        landing=str(request.url)[:400],
    )
    db.add(click)
    if sub:
        sub.total_clicks = (sub.total_clicks or 0) + 1
    if aff:
        aff.total_clicks = (aff.total_clicks or 0) + 1
    db.commit()
    target = build_referral_link(db, btag)
    return RedirectResponse(url=target, status_code=302)
