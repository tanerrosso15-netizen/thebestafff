"""İlk kurulum: master admin + (opsiyonel) demo verisi."""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Activity,
    Affiliate,
    AffiliateGroup,
    Player,
    ReferralClick,
    User,
    WithdrawalRequest,
)
from app.security import hash_password
from app.services.referral import generate_btag

logger = logging.getLogger(__name__)


def seed_admin(db: Session) -> None:
    existing = db.query(User).filter(User.email == settings.master_admin_email).first()
    if existing:
        return
    admin = User(
        name=settings.master_admin_name,
        email=settings.master_admin_email,
        password_hash=hash_password(settings.master_admin_password),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("Master admin oluşturuldu: %s", settings.master_admin_email)


_DEMO_NAMES = [
    ("Seo3", "seo3"),
    ("Seoday", "seoday"),
    ("KingAff", "kingaff"),
    ("Bonuslap", "bonuslap"),
    ("KodKazandir", "kodkazandir"),
    ("BonusAkademi", "bonusakademi"),
    ("MegaPartner", "megapartner"),
    ("WinAffiliate", "winaffiliate"),
]

_FIRST = ["Kenan", "Mücahit", "Volkan", "İzzet", "Habib", "Celalettin", "Ahmet", "Mehmet", "Selin", "Derya"]
_LAST = ["Gök", "Bilek", "Zorlu", "Gündüz", "Demir", "Yıldız", "Kaya", "Aydın", "Çelik", "Şahin"]


def seed_demo(db: Session) -> None:
    if db.query(Affiliate).count() > 0:
        return
    if not settings.seed_demo_data:
        return

    rnd = random.Random(42)

    group = AffiliateGroup(
        name="Standart", description="Varsayılan grup", commission_rate=25.0
    )
    vip = AffiliateGroup(name="VIP", description="Yüksek hacim", commission_rate=35.0)
    db.add_all([group, vip])
    db.commit()

    affiliates: list[Affiliate] = []
    for display, slug in _DEMO_NAMES:
        btag = slug if not db.query(Affiliate).filter(Affiliate.btag == slug).first() else generate_btag(db, slug)
        email = f"{slug}@example.com"
        # Affiliate giriş hesabı
        user = User(
            name=display,
            email=email,
            password_hash=hash_password("affiliate123"),
            role="affiliate",
            is_active=True,
        )
        db.add(user)
        db.commit()
        aff = Affiliate(
            name=display,
            email=email,
            btag=btag,
            commission_rate=rnd.choice([25.0, 25.0, 30.0, 35.0]),
            group_id=rnd.choice([group.id, vip.id]),
            user_id=user.id,
            is_active=True,
            created_at=datetime.now(timezone.utc) - timedelta(days=rnd.randint(1, 60)),
        )
        db.add(aff)
        db.commit()
        affiliates.append(aff)

    # Çok kademeli: bazı affiliate'leri başkalarının altına bağla
    for aff in affiliates[3:]:
        aff.parent_id = rnd.choice(affiliates[:3]).id
    db.commit()

    # Demo oyuncular
    pid = 425600000
    for i in range(120):
        pid += rnd.randint(1, 90)
        aff = rnd.choice(affiliates)
        deposit = round(rnd.choice([0, 0, 0, 100, 250, 500, 1000, 2500, 5000]) * rnd.random(), 2)
        withdrawal = round(deposit * rnd.uniform(0, 0.8), 2)
        first = rnd.choice(_FIRST)
        last = rnd.choice(_LAST)
        casino_b = round(deposit * rnd.uniform(0.5, 3.0), 2)
        casino_w = round(casino_b * rnd.uniform(0.7, 1.1), 2)
        sport_b = round(deposit * rnd.uniform(0, 1.5), 2)
        sport_w = round(sport_b * rnd.uniform(0.7, 1.05), 2)
        player = Player(
            external_id=str(pid),
            name=f"{first} {last}",
            username=f"{first.lower()}{rnd.randint(1, 9999)}",
            email=f"player{pid}@mail.com",
            btag=aff.btag,
            balance=round(rnd.uniform(0, 6000), 2),
            deposit_total=deposit,
            withdrawal_total=withdrawal,
            deposit_count=rnd.randint(0, 12) if deposit else 0,
            withdrawal_count=rnd.randint(0, 6) if withdrawal else 0,
            profit_loss=round(withdrawal - deposit, 2),
            casino_bets=casino_b,
            casino_wins=casino_w,
            sport_bets=sport_b,
            sport_wins=sport_w,
            status=rnd.choice(["active", "active", "active", "passive"]),
            registered_at=datetime.now(timezone.utc) - timedelta(days=rnd.randint(0, 90)),
            affiliate_id=aff.id,
        )
        db.add(player)
    db.commit()

    # Çekim istekleri
    sample_players = db.query(Player).filter(Player.withdrawal_total > 0).limit(15).all()
    for p in sample_players:
        db.add(
            WithdrawalRequest(
                player_id=p.id,
                player_name=p.name,
                player_external_id=p.external_id,
                btag=p.btag,
                amount=round(rnd.uniform(50, 3000), 2),
                method=rnd.choice(["Havale", "Papara", "Kripto"]),
                status=rnd.choice(["pending", "pending", "approved", "rejected"]),
                requested_at=datetime.now(timezone.utc) - timedelta(hours=rnd.randint(0, 72)),
            )
        )
    db.commit()

    # Tıklamalar
    for aff in affiliates:
        for _ in range(rnd.randint(50, 900)):
            db.add(
                ReferralClick(
                    btag=aff.btag,
                    ip=f"{rnd.randint(1,255)}.{rnd.randint(0,255)}.{rnd.randint(0,255)}.{rnd.randint(1,255)}",
                    user_agent="Mozilla/5.0",
                    created_at=datetime.now(timezone.utc) - timedelta(minutes=rnd.randint(0, 50000)),
                )
            )
    db.commit()

    # Aktiviteler
    for _ in range(20):
        db.add(
            Activity(
                type=rnd.choice(["login", "deposit", "withdrawal", "register", "info"]),
                title=rnd.choice(["Yeni oyuncu kaydı", "Para yatırma", "Çekim talebi", "Giriş"]),
                description="Demo aktivite kaydı.",
                actor=rnd.choice([a.name for a in affiliates]),
                created_at=datetime.now(timezone.utc) - timedelta(minutes=rnd.randint(0, 5000)),
            )
        )
    db.commit()
    logger.info("Demo veri yüklendi.")


def run_seed(db: Session) -> None:
    seed_admin(db)
    seed_demo(db)
