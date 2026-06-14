"""Affiliate yönetimi — liste, oluştur, güncelle, sil."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Activity, Affiliate, AffiliateGroup, Player, SubBtag, User
from app.schemas import AffiliateCreate, AffiliateOut, AffiliateUpdate, ImpersonateOut
from app.security import create_access_token, hash_password
from app.services.referral import generate_btag
from app.services.settings_store import build_referral_link

router = APIRouter(prefix="/api/affiliates", tags=["affiliates"])


def _to_out(db: Session, aff: Affiliate) -> AffiliateOut:
    out = AffiliateOut.model_validate(aff)
    out.group_name = aff.group.name if aff.group else None
    out.referral_link = build_referral_link(db, aff.btag)
    return out


@router.get("", response_model=list[AffiliateOut])
def list_affiliates(
    q: str | None = Query(None),
    group_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Affiliate)
    # Affiliate kullanıcı yalnızca kendini + alt affiliate'lerini görür
    if user.role == "affiliate":
        own = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
        if not own:
            return []
        query = query.filter(
            or_(Affiliate.id == own.id, Affiliate.parent_id == own.id)
        )
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(Affiliate.name.ilike(like), Affiliate.email.ilike(like), Affiliate.btag.ilike(like))
        )
    if group_id is not None:
        query = query.filter(Affiliate.group_id == group_id)
    if is_active is not None:
        query = query.filter(Affiliate.is_active.is_(is_active))
    rows = query.order_by(Affiliate.created_at.desc()).all()
    return [_to_out(db, a) for a in rows]


@router.get("/{affiliate_id}", response_model=AffiliateOut)
def get_affiliate(
    affiliate_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")
    if user.role == "affiliate":
        own = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
        if not own or (aff.id != own.id and aff.parent_id != own.id):
            raise HTTPException(status_code=403, detail="Yetkiniz yok.")
    return _to_out(db, aff)


@router.post("", response_model=AffiliateOut)
def create_affiliate(
    payload: AffiliateCreate,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    btag = (payload.btag or "").strip() or generate_btag(db, payload.name)
    if db.query(Affiliate).filter(Affiliate.btag == btag).first():
        raise HTTPException(status_code=400, detail="Bu btag zaten kullanılıyor.")

    parent_id = None
    if payload.parent_btag:
        parent = db.query(Affiliate).filter(Affiliate.btag == payload.parent_btag.strip()).first()
        if parent:
            parent_id = parent.id

    login_user_id = None
    if payload.create_login and payload.email:
        if db.query(User).filter(User.email == payload.email.lower()).first():
            raise HTTPException(status_code=400, detail="Bu e-posta ile kullanıcı zaten var.")
        new_user = User(
            name=payload.name,
            email=payload.email.lower(),
            password_hash=hash_password(payload.password or "demo-password-change-me"),
            role="affiliate",
            is_active=payload.is_active,
        )
        db.add(new_user)
        db.commit()
        login_user_id = new_user.id

    aff = Affiliate(
        name=payload.name,
        email=payload.email,
        btag=btag,
        commission_rate=payload.commission_rate,
        group_id=payload.group_id,
        parent_id=parent_id,
        user_id=login_user_id,
        is_active=payload.is_active,
    )
    db.add(aff)
    db.commit()
    db.refresh(aff)
    db.add(
        Activity(
            type="affiliate",
            title="Affiliate oluşturuldu",
            description=f"{aff.name} ({aff.btag})",
            actor=user.name,
            affiliate_id=aff.id,
        )
    )
    db.commit()
    return _to_out(db, aff)


@router.post("/{affiliate_id}/impersonate", response_model=ImpersonateOut)
def impersonate_affiliate(
    affiliate_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin, affiliate'in panelini görüntülemek için onun oturum token'ını alır."""
    aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")

    target = db.query(User).filter(User.id == aff.user_id).first() if aff.user_id else None
    if not target:
        # Giriş hesabı yoksa otomatik oluştur
        email = (aff.email or f"aff{aff.id}@pqp.local").lower()
        if db.query(User).filter(User.email == email).first():
            email = f"aff{aff.id}@pqp.local"
        target = User(
            name=aff.name,
            email=email,
            password_hash=hash_password(generate_btag(db, aff.name) + "X1!"),
            role="affiliate",
            is_active=True,
        )
        db.add(target)
        db.commit()
        db.refresh(target)
        aff.user_id = target.id
        db.commit()

    token = create_access_token(str(target.id), target.role)
    return ImpersonateOut(
        access_token=token,
        role=target.role,
        name=target.name,
        affiliate_id=aff.id,
    )


@router.get("/{affiliate_id}/subbtag-report")
def subbtag_report(
    affiliate_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Affiliate'in ana + alt btag'lerinin ayrı ayrı performansı (tek yerden)."""
    aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")
    if user.role == "affiliate":
        own = db.query(Affiliate).filter(Affiliate.user_id == user.id).first()
        if not own or own.id != aff.id:
            raise HTTPException(status_code=403, detail="Yetkiniz yok.")

    subs = db.query(SubBtag).filter(SubBtag.affiliate_id == aff.id).all()
    rate = aff.commission_rate or 0
    rows = []

    def _stats(btag: str, label: str, is_main: bool):
        players = db.query(Player).filter(Player.btag == btag).all()
        deposit = sum(p.deposit_total or 0 for p in players)
        withdrawal = sum(p.withdrawal_total or 0 for p in players)
        net = deposit - withdrawal
        return {
            "btag": btag,
            "label": label,
            "is_main": is_main,
            "players": len(players),
            "deposit": round(deposit, 2),
            "withdrawal": round(withdrawal, 2),
            "net": round(net, 2),
            "commission": round(max(net, 0) * rate / 100, 2),
        }

    rows.append(_stats(aff.btag, "Ana btag", True))
    for s in subs:
        rows.append(_stats(s.btag, s.label or s.btag, False))

    totals = {
        "players": sum(r["players"] for r in rows),
        "deposit": round(sum(r["deposit"] for r in rows), 2),
        "withdrawal": round(sum(r["withdrawal"] for r in rows), 2),
        "net": round(sum(r["net"] for r in rows), 2),
        "commission": round(sum(r["commission"] for r in rows), 2),
    }
    return {
        "affiliate": {"id": aff.id, "name": aff.name, "btag": aff.btag, "commission_rate": rate},
        "rows": rows,
        "totals": totals,
    }


@router.put("/{affiliate_id}", response_model=AffiliateOut)
def update_affiliate(
    affiliate_id: int,
    payload: AffiliateUpdate,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(aff, k, v)
    db.commit()
    db.refresh(aff)
    return _to_out(db, aff)


@router.patch("/{affiliate_id}/toggle", response_model=AffiliateOut)
def toggle_affiliate(
    affiliate_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")
    aff.is_active = not aff.is_active
    if aff.user:
        aff.user.is_active = aff.is_active
    db.commit()
    db.refresh(aff)
    return _to_out(db, aff)


@router.delete("/{affiliate_id}")
def delete_affiliate(
    affiliate_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    aff = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate bulunamadı.")
    db.delete(aff)
    db.commit()
    return {"ok": True}
