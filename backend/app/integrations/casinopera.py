"""Platform backoffice API istemcisi."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.services.settings_store import get_setting

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


# Backoffice alan eşlemesi
FIELD_MAP = {
    "external_id": "userId",
    "username": "userName",
    "first_name": "firstName",
    "last_name": "lastName",
    "email": "email",
    "status": "status",
    "registered_at": "registrationDate",
    "last_login_at": "lastLoginDate",
    "btag": "bTag",
    "balance": "balance",
}


def normalize_cookie(raw: str) -> str:
    cookie = (raw or "").replace("\r\n", "\n").strip()
    if cookie.lower().startswith("cookie:"):
        cookie = cookie.split(":", 1)[1].strip()
    if "\n" in cookie:
        cookie = " ".join(line.strip() for line in cookie.split("\n") if line.strip())
    return cookie


def _session_file() -> Path:
    rel = (settings.casinopera_session_file or "data/platform.cookie").strip()
    p = Path(rel)
    return p if p.is_absolute() else PROJECT_ROOT / p


def load_cookie(db: Session) -> str:
    """Öncelik: DB ayarı → .env → cookie dosyası."""
    db_cookie = normalize_cookie(get_setting(db, "casinopera_cookie", ""))
    if db_cookie:
        return db_cookie
    if settings.casinopera_session_cookie:
        return normalize_cookie(settings.casinopera_session_cookie)
    f = _session_file()
    if f.is_file():
        try:
            return normalize_cookie(f.read_text(encoding="utf-8"))
        except OSError:
            return ""
    return ""


def save_cookie_file(cookie: str) -> Path:
    f = _session_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(normalize_cookie(cookie), encoding="utf-8")
    return f


def _api_root() -> str:
    base = settings.casinopera_base_url.rstrip("/")
    for suffix in ("/api/user/api/v1.0", "/api/v1.0"):
        if base.endswith(suffix):
            return base[: -len(suffix)]
    if "/api/" in base:
        return base.rsplit("/api/", 1)[0]
    return base


def _payment_bases() -> tuple[str, str, str]:
    root = _api_root()
    return (
        f"{root}/api/payment-operations/api/v1.0",
        f"{root}/api/operation/api/v1.0",
        f"{root}/api/sportOperation/api/v1.0",
    )


class CasinoOperaClient:
    def __init__(self, cookie: str, site_id: str | None = None):
        self.cookie = normalize_cookie(cookie)
        self.site_id = site_id or settings.casinopera_site_id
        self.base_url = settings.casinopera_base_url.rstrip("/")

    @property
    def configured(self) -> bool:
        return bool(self.cookie)

    def _headers(self) -> dict[str, str]:
        return {
            "Cookie": self.cookie,
            "Accept": "application/json",
            "sl-id": str(self.site_id),
            "User-Agent": "Mozilla/5.0 AffiliatePanel/1.0",
        }

    async def fetch_players(self, page: int = 1, per_page: int = 100) -> list[dict[str, Any]]:
        """Oyuncu listesini çeker. Hata olursa boş liste döner."""
        if not self.configured:
            return []
        url = f"{self.base_url}/userBackOffice"
        params = {
            "siteId": str(self.site_id),
            "countPerPage": str(per_page),
            "page": str(page),
        }
        try:
            async with httpx.AsyncClient(timeout=settings.platform_api_timeout) as client:
                resp = await client.get(url, headers=self._headers(), params=params)
            if resp.status_code in (401, 403):
                logger.warning("CasinoOpera oturumu geçersiz (%s).", resp.status_code)
                return []
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("CasinoOpera oyuncu çekme hatası: %s", exc)
            return []

        return _as_list(data)

    async def _get_list(
        self, url: str, params: dict[str, str], max_pages: int = 5
    ) -> list[dict[str, Any]]:
        """Sayfalı GET — listeyi toplar. Hata olursa eldekini döner."""
        out: list[dict[str, Any]] = []
        page = 1
        try:
            async with httpx.AsyncClient(timeout=settings.platform_api_timeout) as client:
                while page <= max_pages:
                    p = {**params, "page": str(page)}
                    resp = await client.get(url, headers=self._headers(), params=p)
                    if resp.status_code != 200:
                        break
                    batch = _as_list(resp.json())
                    if not batch:
                        break
                    out.extend(batch)
                    if len(batch) < int(params.get("countPerPage", "100")):
                        break
                    page += 1
        except (httpx.HTTPError, ValueError) as exc:
            logger.debug("Liste çekme hatası %s: %s", url, exc)
        return out

    async def fetch_transactions(self, user_id: str) -> list[dict[str, Any]]:
        payment_base, _, _ = _payment_bases()
        url = f"{payment_base}/backofficeTransactions/users/{user_id}/sites/{self.site_id}"
        return await self._get_list(url, {"siteId": str(self.site_id), "countPerPage": "100"})

    async def fetch_casino_bets(self, user_id: str) -> list[dict[str, Any]]:
        _, operation_base, _ = _payment_bases()
        url = f"{operation_base}/backOffices/players/{user_id}/site/{self.site_id}"
        return await self._get_list(url, {"siteId": str(self.site_id), "countPerPage": "100"}, max_pages=3)

    async def fetch_sport_bets(self, user_id: str) -> list[dict[str, Any]]:
        _, _, sport_base = _payment_bases()
        url = f"{sport_base}/sportBetEvent/players/{user_id}/site/{self.site_id}"
        return await self._get_list(url, {"siteId": str(self.site_id), "countPerPage": "100"}, max_pages=3)

    async def probe(self) -> dict[str, Any]:
        """Cookie geçerli mi — hafif kontrol."""
        if not self.configured:
            return {"alive": False, "configured": False, "error": "Cookie tanımlı değil."}
        players = await self.fetch_players(page=1, per_page=1)
        if players:
            return {"alive": True, "configured": True, "sample": len(players)}
        return {
            "alive": False,
            "configured": True,
            "error": "Yanıt alınamadı veya oturum süresi dolmuş.",
        }


def _as_list(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "items", "result", "users", "records", "value"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def map_player(raw: dict[str, Any]) -> dict[str, Any]:
    """Ham API kaydını iç şemaya çevirir."""
    def g(*keys: str) -> Any:
        for k in keys:
            if k in raw and raw[k] not in (None, ""):
                return raw[k]
        return None

    name = (g("userName") or "")
    return {
        "external_id": str(g("userId", "id") or ""),
        "username": g("userName") or "",
        "name": name,
        "email": g("email") or "",
        "btag": str(g("bTag", "btag", "bTagId", "affiliateTag") or ""),
        "category": g("categoryName") or "",
        "currency": g("preferredCurrency") or "TRY",
        "wallet_number": str(g("walletNumber") or ""),
        "phone": str(g("phoneNumber") or ""),
        "status": str(g("status") or "active"),
        "registered_raw": g("registrationDate"),
        "last_login_raw": g("lastLoginDate"),
    }


def aggregate_transactions(txs: list[dict[str, Any]]) -> dict[str, Any]:
    """İşlemlerden yatırım/çekim toplamları + bekleyen çekimler."""
    dep_total = wd_total = 0.0
    dep_count = wd_count = 0
    currency = "TRY"
    pending: list[dict[str, Any]] = []
    for tx in txs:
        ttype = str(tx.get("transactionType") or tx.get("paymentType") or "").lower()
        status = str(tx.get("status") or "").lower()
        amount = float(tx.get("amount") or tx.get("actualAmount") or 0) or 0.0
        currency = tx.get("currency") or currency
        if ttype == "deposit" and status == "success":
            dep_total += amount
            dep_count += 1
        elif ttype == "withdrawal" and status == "success":
            wd_total += amount
            wd_count += 1
        if ttype == "withdrawal" and status in ("pendingproviderapproval", "pending", "pendingapproval"):
            pending.append(
                {
                    "external_id": str(tx.get("id") or tx.get("platformTransactionId") or ""),
                    "amount": amount,
                    "currency": tx.get("currency") or "TRY",
                    "method": tx.get("method") or "",
                    "created_at": tx.get("createdAt"),
                }
            )
    return {
        "deposit_total": round(dep_total, 2),
        "withdrawal_total": round(wd_total, 2),
        "deposit_count": dep_count,
        "withdrawal_count": wd_count,
        "currency": currency,
        "pending_withdrawals": pending,
    }


def aggregate_casino(bets: list[dict[str, Any]]) -> dict[str, float]:
    """Casino: balanceBefore/After ile bahis(loss) ve kazanç ayrımı."""
    wager = win = 0.0
    for b in bets:
        amount = float(b.get("amount") or 0) or 0.0
        before = b.get("balanceBefore")
        after = b.get("balanceAfter")
        try:
            before_f = float(before)
            after_f = float(after)
        except (TypeError, ValueError):
            wager += amount
            continue
        if after_f >= before_f:
            win += amount
        else:
            wager += amount
    return {"casino_bets": round(wager, 2), "casino_wins": round(win, 2)}


def aggregate_sport(bets: list[dict[str, Any]]) -> dict[str, float]:
    """Spor: amount = bahis, wonAmount = kazanç."""
    wager = win = 0.0
    for b in bets:
        wager += float(b.get("amount") or 0) or 0.0
        win += float(b.get("wonAmount") or 0) or 0.0
    return {"sport_bets": round(wager, 2), "sport_wins": round(win, 2)}
