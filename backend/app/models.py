"""Tüm SQLAlchemy modelleri.

Roller:
- admin    : tam yetki (panel yöneticisi)
- manager  : sınırlı yönetim (Kullanıcılar > Yetkilendirme)
- affiliate: kendi paneli (getirdiği oyuncular, referans linkleri, komisyon)
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PermissionGroup(Base):
    """Yetki grubu — menü bazlı görüntüle / düzenle / sil."""

    __tablename__ = "permission_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSON, default=dict)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="permission_group")


class Merchant(Base):
    """Platform / merchant yapılandırması (CasinoOpera fetcher, domainler)."""

    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    infrastructure: Mapped[str] = mapped_column(String(60), default="casinopera")
    trial_period: Mapped[str] = mapped_column(String(30), default="none")
    fetcher_email: Mapped[str] = mapped_column(String(180), default="")
    fetcher_password: Mapped[str] = mapped_column(String(255), default="")
    fetcher_otp_secret: Mapped[str] = mapped_column(String(255), default="")
    active_domain: Mapped[str] = mapped_column(String(255), default="")
    active_affiliate_domain: Mapped[str] = mapped_column(String(255), default="")
    backoffice_url: Mapped[str] = mapped_column(String(500), default="")
    site_id: Mapped[str] = mapped_column(String(30), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class User(Base):
    """Giriş yapabilen hesap (admin / staff / affiliate)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="affiliate", nullable=False)
    permission_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("permission_groups.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    permission_group: Mapped["PermissionGroup | None"] = relationship(
        back_populates="users"
    )
    affiliate: Mapped["Affiliate | None"] = relationship(
        back_populates="user", uselist=False
    )


class AffiliateGroup(Base):
    """Affiliate grubu — ortak komisyon oranı ve ayarlar."""

    __tablename__ = "affiliate_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")
    commission_rate: Mapped[float] = mapped_column(Float, default=25.0)
    revenue_share: Mapped[float] = mapped_column(Float, default=0.0)
    cpa_amount: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    affiliates: Mapped[list["Affiliate"]] = relationship(back_populates="group")


class Affiliate(Base):
    """Affiliate kaydı — referans linki (btag) sahibi."""

    __tablename__ = "affiliates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(180), index=True, default="")
    btag: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    commission_rate: Mapped[float] = mapped_column(Float, default=25.0)
    balance: Mapped[float] = mapped_column(Float, default=0.0)
    w_commission: Mapped[float] = mapped_column(Float, default=0.0)  # kazanılan komisyon
    total_clicks: Mapped[int] = mapped_column(Integer, default=0)
    total_players: Mapped[int] = mapped_column(Integer, default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    group_id: Mapped[int | None] = mapped_column(ForeignKey("affiliate_groups.id"), nullable=True)
    # Çok kademeli affiliate — bir affiliate başka affiliate getirebilir
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("affiliates.id"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    group: Mapped["AffiliateGroup | None"] = relationship(back_populates="affiliates")
    user: Mapped["User | None"] = relationship(back_populates="affiliate")
    parent: Mapped["Affiliate | None"] = relationship(remote_side=[id], backref="children")
    players: Mapped[list["Player"]] = relationship(back_populates="affiliate")


class SubBtag(Base):
    """Affiliate alt btag'i — örn. ana 'ord' → 'ord_xx'. Tek panelden ayrı raporlanır."""

    __tablename__ = "sub_btags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    btag: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120), default="")
    total_clicks: Mapped[int] = mapped_column(Integer, default=0)
    total_players: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Message(Base):
    """Admin ↔ Affiliate mesajlaşması. Thread = affiliate bazlı."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    affiliate_id: Mapped[int] = mapped_column(ForeignKey("affiliates.id"), index=True)
    sender_role: Mapped[str] = mapped_column(String(20), default="affiliate")  # admin/affiliate
    sender_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    sender_name: Mapped[str] = mapped_column(String(160), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    image_path: Mapped[str] = mapped_column(String(300), default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Player(Base):
    """CasinoOpera oyuncusu — btag ile bir affiliate'e bağlı."""

    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String(64), index=True, default="")  # OYUNCU ID
    name: Mapped[str] = mapped_column(String(160), default="")
    username: Mapped[str] = mapped_column(String(120), index=True, default="")
    email: Mapped[str] = mapped_column(String(180), default="")
    btag: Mapped[str] = mapped_column(String(64), index=True, default="")
    category: Mapped[str] = mapped_column(String(80), default="")
    currency: Mapped[str] = mapped_column(String(10), default="TRY")
    wallet_number: Mapped[str] = mapped_column(String(60), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")

    balance: Mapped[float] = mapped_column(Float, default=0.0)
    deposit_total: Mapped[float] = mapped_column(Float, default=0.0)
    withdrawal_total: Mapped[float] = mapped_column(Float, default=0.0)
    deposit_count: Mapped[int] = mapped_column(Integer, default=0)
    withdrawal_count: Mapped[int] = mapped_column(Integer, default=0)
    profit_loss: Mapped[float] = mapped_column(Float, default=0.0)

    casino_bets: Mapped[float] = mapped_column(Float, default=0.0)
    casino_wins: Mapped[float] = mapped_column(Float, default=0.0)
    sport_bets: Mapped[float] = mapped_column(Float, default=0.0)
    sport_wins: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[str] = mapped_column(String(40), default="active")
    registered_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    affiliate_id: Mapped[int | None] = mapped_column(ForeignKey("affiliates.id"), nullable=True)
    affiliate: Mapped["Affiliate | None"] = relationship(back_populates="players")


class WithdrawalRequest(Base):
    """Çekim isteği."""

    __tablename__ = "withdrawal_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String(80), index=True, default="")  # platform tx id
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), nullable=True)
    player_name: Mapped[str] = mapped_column(String(160), default="")
    player_external_id: Mapped[str] = mapped_column(String(64), default="")
    btag: Mapped[str] = mapped_column(String(64), default="")
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="TRY")
    method: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(40), default="pending")  # pending/approved/rejected
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Activity(Base):
    """Aktivite / işlem günlüğü."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(60), default="info")
    title: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    actor: Mapped[str] = mapped_column(String(160), default="")
    affiliate_id: Mapped[int | None] = mapped_column(ForeignKey("affiliates.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class ReferralClick(Base):
    """Referans linki tıklaması — TOPLAM TIKLAMA için."""

    __tablename__ = "referral_clicks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    btag: Mapped[str] = mapped_column(String(64), index=True, default="")
    ip: Mapped[str] = mapped_column(String(60), default="")
    user_agent: Mapped[str] = mapped_column(String(400), default="")
    referer: Mapped[str] = mapped_column(String(400), default="")
    landing: Mapped[str] = mapped_column(String(400), default="")
    converted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Setting(Base):
    """Anahtar/değer sistem ayarları (cookie, marka vb.)."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
