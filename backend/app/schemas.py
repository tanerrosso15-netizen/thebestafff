"""Pydantic şemaları — API giriş/çıkış modelleri."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    email: str


class MeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    affiliate_id: int | None = None
    btag: str | None = None
    permission_group_id: int | None = None
    permission_group_name: str | None = None
    permissions: dict[str, dict[str, bool]] = Field(default_factory=dict)


# ---------- User ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=4)
    role: str = "staff"
    permission_group_id: int | None = None
    is_active: bool = True
    commission_rate: float | None = None
    group_id: int | None = None
    parent_btag: str | None = None
    btag: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role: str | None = None
    permission_group_id: int | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    permission_group_id: int | None = None
    permission_group_name: str | None = None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None
    affiliate_id: int | None = None


# ---------- Affiliate ----------
class AffiliateCreate(BaseModel):
    name: str
    email: str = ""
    btag: str | None = None
    commission_rate: float = 25.0
    group_id: int | None = None
    parent_btag: str | None = None
    is_active: bool = True
    # İsteğe bağlı: aynı anda giriş hesabı oluştur
    create_login: bool = False
    password: str | None = None


class AffiliateUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    commission_rate: float | None = None
    group_id: int | None = None
    is_active: bool | None = None
    balance: float | None = None


class AffiliateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    btag: str
    commission_rate: float
    balance: float
    w_commission: float
    total_clicks: int
    total_players: int
    is_active: bool
    created_at: datetime
    group_id: int | None = None
    parent_id: int | None = None
    group_name: str | None = None
    referral_link: str | None = None


# ---------- Affiliate Group ----------
class GroupCreate(BaseModel):
    name: str
    description: str = ""
    commission_rate: float = 25.0
    revenue_share: float = 0.0
    cpa_amount: float = 0.0
    is_active: bool = True


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    commission_rate: float | None = None
    revenue_share: float | None = None
    cpa_amount: float | None = None
    is_active: bool | None = None


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    commission_rate: float
    revenue_share: float
    cpa_amount: float
    is_active: bool
    created_at: datetime
    affiliate_count: int = 0


# ---------- Player ----------
class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    external_id: str
    name: str
    username: str
    email: str
    btag: str
    category: str = ""
    currency: str = "TRY"
    wallet_number: str = ""
    phone: str = ""
    balance: float
    deposit_total: float
    withdrawal_total: float
    deposit_count: int
    withdrawal_count: int
    profit_loss: float
    casino_bets: float
    casino_wins: float
    sport_bets: float
    sport_wins: float
    status: str
    registered_at: datetime
    last_synced_at: datetime | None = None
    affiliate_id: int | None = None
    affiliate_name: str | None = None


# ---------- Withdrawal ----------
class WithdrawalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    player_id: int | None
    player_name: str
    player_external_id: str
    btag: str
    amount: float
    currency: str
    method: str
    status: str
    requested_at: datetime
    resolved_at: datetime | None = None


class WithdrawalUpdate(BaseModel):
    status: str


# ---------- Activity ----------
class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    title: str
    description: str
    actor: str
    affiliate_id: int | None = None
    created_at: datetime


# ---------- Settings ----------
class SettingItem(BaseModel):
    key: str
    value: str


class CookieUpdate(BaseModel):
    cookie: str


# ---------- Sub-btag ----------
class SubBtagCreate(BaseModel):
    suffix: str  # örn "xx" → ana btag "ord" ise "ord_xx"
    label: str = ""


class SubBtagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    affiliate_id: int
    btag: str
    label: str
    total_clicks: int
    total_players: int
    created_at: datetime
    referral_link: str | None = None


# ---------- Message ----------
class MessageCreate(BaseModel):
    affiliate_id: int | None = None  # admin için hedef; affiliate kendi thread'i
    body: str = ""


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    affiliate_id: int
    sender_role: str
    sender_name: str
    body: str
    image_path: str
    is_read: bool
    created_at: datetime


class ThreadOut(BaseModel):
    affiliate_id: int
    affiliate_name: str
    btag: str
    last_message: str
    last_at: datetime | None = None
    unread: int = 0


# ---------- Impersonation ----------
class ImpersonateOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    affiliate_id: int


# ---------- Pagination wrapper ----------
class Paginated(BaseModel):
    items: list
    total: int
    page: int
    per_page: int


# ---------- RBAC ----------
class PermissionGroupCreate(BaseModel):
    name: str
    permissions: dict[str, dict[str, bool]] = Field(default_factory=dict)


class PermissionGroupUpdate(BaseModel):
    name: str | None = None
    permissions: dict[str, dict[str, bool]] | None = None


class PermissionGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    permissions: dict[str, dict[str, bool]]
    is_system: bool
    created_at: datetime


# ---------- Merchant ----------
class MerchantCreate(BaseModel):
    name: str
    infrastructure: str = "casinopera"
    trial_period: str = "none"
    fetcher_email: str = ""
    fetcher_password: str = ""
    fetcher_otp_secret: str = ""
    active_domain: str = ""
    active_affiliate_domain: str = ""
    backoffice_url: str = ""
    site_id: str = ""
    is_active: bool = True


class MerchantUpdate(BaseModel):
    name: str | None = None
    infrastructure: str | None = None
    trial_period: str | None = None
    fetcher_email: str | None = None
    fetcher_password: str | None = None
    fetcher_otp_secret: str | None = None
    active_domain: str | None = None
    active_affiliate_domain: str | None = None
    backoffice_url: str | None = None
    site_id: str | None = None
    is_active: bool | None = None


class MerchantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    infrastructure: str
    trial_period: str
    fetcher_email: str
    fetcher_password: str
    fetcher_otp_secret: str
    active_domain: str
    active_affiliate_domain: str
    backoffice_url: str
    site_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
