"""Oyuncu senkronizasyonu — CasinoPera'dan gerçek veri çeker.

- Oyuncu listesi (userBackOffice)
- Oyuncu başına işlemler → yatırım/çekim, bekleyen çekimler
- Oyuncu başına casino + spor bahisleri
- btag eşleşmesine göre affiliate bağlama + komisyon hesaplama

Cookie yoksa mevcut SQL verisiyle yalnızca özetler güncellenir.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.integrations.casinopera import (
    CasinoOperaClient,
    aggregate_casino,
    aggregate_sport,
    aggregate_transactions,
    load_cookie,
    map_player,
)
from app.models import Activity, Affiliate, Player, ReferralClick, SubBtag, WithdrawalRequest

logger = logging.getLogger(__name__)

_DATE_FORMATS = (
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
)


def _parse_dt(value) -> datetime | None:
    if not value:
        return None
    s = str(value).strip()
    if s.endswith("+00:00"):
        s = s.replace("+00:00", "Z")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00").replace("+00:00", ""))
    except (ValueError, TypeError):
        return None


def _upsert_player_basic(db: Session, raw: dict) -> Player | None:
    m = map_player(raw)
    ext = m["external_id"]
    if not ext:
        return None
    player = db.query(Player).filter(Player.external_id == ext).first()
    if not player:
        player = Player(external_id=ext, registered_at=datetime.now(timezone.utc))
        db.add(player)
    player.username = m["username"] or player.username
    player.name = m["name"] or player.name
    player.email = m["email"] or player.email
    if m["btag"]:
        player.btag = m["btag"]
    player.category = m["category"]
    player.currency = m["currency"]
    player.wallet_number = m["wallet_number"]
    player.phone = m["phone"]
    player.status = m["status"]
    reg = _parse_dt(m.get("registered_raw"))
    if reg:
        player.registered_at = reg
    last = _parse_dt(m.get("last_login_raw"))
    if last:
        player.last_login_at = last
    player.last_synced_at = datetime.now(timezone.utc)
    return player


def _sync_pending_withdrawals(db: Session, player: Player, pendings: list[dict]) -> None:
    """Bekleyen çekim işlemlerini WithdrawalRequest olarak yaz (tekrarsız)."""
    for pw in pendings:
        ext = pw["external_id"]
        if not ext:
            continue
        existing = (
            db.query(WithdrawalRequest).filter(WithdrawalRequest.external_id == ext).first()
        )
        if existing:
            existing.status = "pending"
            continue
        db.add(
            WithdrawalRequest(
                external_id=ext,
                player_id=player.id,
                player_name=player.name,
                player_external_id=player.external_id,
                btag=player.btag,
                amount=pw["amount"],
                currency=pw["currency"],
                method=pw["method"],
                status="pending",
                requested_at=_parse_dt(pw.get("created_at")) or datetime.now(timezone.utc),
            )
        )


async def _sync_player_financials(db: Session, client: CasinoOperaClient, player: Player) -> None:
    txs = await client.fetch_transactions(player.external_id)
    agg = aggregate_transactions(txs)
    player.deposit_total = agg["deposit_total"]
    player.withdrawal_total = agg["withdrawal_total"]
    player.deposit_count = agg["deposit_count"]
    player.withdrawal_count = agg["withdrawal_count"]
    if agg["currency"]:
        player.currency = agg["currency"]
    player.profit_loss = round(agg["withdrawal_total"] - agg["deposit_total"], 2)
    # Gerçek bakiye API'de yok → net yatırım (yatırım-çekim) yaklaşık değeri
    player.balance = round(max(0.0, agg["deposit_total"] - agg["withdrawal_total"]), 2)

    casino = aggregate_casino(await client.fetch_casino_bets(player.external_id))
    player.casino_bets = casino["casino_bets"]
    player.casino_wins = casino["casino_wins"]
    sport = aggregate_sport(await client.fetch_sport_bets(player.external_id))
    player.sport_bets = sport["sport_bets"]
    player.sport_wins = sport["sport_wins"]

    _sync_pending_withdrawals(db, player, agg["pending_withdrawals"])


def link_players_to_affiliates(db: Session) -> None:
    # Ana btag + alt btag → affiliate eşlemesi
    btag_map = {a.btag: a.id for a in db.query(Affiliate).all() if a.btag}
    for s in db.query(SubBtag).all():
        btag_map[s.btag] = s.affiliate_id
    for p in db.query(Player).all():
        if p.btag and p.btag in btag_map:
            p.affiliate_id = btag_map[p.btag]
    db.commit()


def _affiliate_commission(db: Session, aff: Affiliate) -> float:
    agg = (
        db.query(
            func.coalesce(func.sum(Player.deposit_total), 0.0),
            func.coalesce(func.sum(Player.withdrawal_total), 0.0),
        )
        .filter(Player.affiliate_id == aff.id)
        .first()
    )
    net = max(0.0, float(agg[0] or 0.0) - float(agg[1] or 0.0))
    return net * (aff.commission_rate or 0.0) / 100.0


def recompute_affiliate_aggregates(db: Session) -> None:
    for aff in db.query(Affiliate).all():
        total = db.query(func.count(Player.id)).filter(Player.affiliate_id == aff.id).scalar()
        aff.total_players = int(total or 0)
        aff.w_commission = round(_affiliate_commission(db, aff), 2)
    db.commit()


def update_click_counts(db: Session) -> None:
    rows = (
        db.query(ReferralClick.btag, func.count(ReferralClick.id))
        .group_by(ReferralClick.btag)
        .all()
    )
    by_btag = {btag: int(c) for btag, c in rows}
    # Affiliate tıklamaları = ana btag + alt btag'lerin toplamı
    sub_by_aff: dict[int, list[SubBtag]] = {}
    for s in db.query(SubBtag).all():
        sub_by_aff.setdefault(s.affiliate_id, []).append(s)
        s.total_clicks = by_btag.get(s.btag, 0)
        s.total_players = (
            db.query(func.count(Player.id)).filter(Player.btag == s.btag).scalar() or 0
        )
    for aff in db.query(Affiliate).all():
        total = by_btag.get(aff.btag, 0)
        for s in sub_by_aff.get(aff.id, []):
            total += by_btag.get(s.btag, 0)
        aff.total_clicks = total
    db.commit()


async def run_sync(db: Session, *, deep: bool = True) -> dict:
    """Tam senkron. deep=True → oyuncu başına finans + bahis çeker (gerçek veri)."""
    cookie = load_cookie(db)
    client = CasinoOperaClient(cookie)
    fetched = 0
    financial = 0

    if client.configured:
        players_raw = await client.fetch_players(page=1, per_page=100)
        # birden fazla sayfa
        page = 2
        while len(players_raw) % 100 == 0 and players_raw:
            more = await client.fetch_players(page=page, per_page=100)
            if not more:
                break
            players_raw.extend(more)
            page += 1
            if page > 20:
                break

        synced_players: list[Player] = []
        for raw in players_raw:
            p = _upsert_player_basic(db, raw)
            if p:
                synced_players.append(p)
                fetched += 1
        db.commit()

        if deep:
            for p in synced_players:
                try:
                    await _sync_player_financials(db, client, p)
                    financial += 1
                except Exception as exc:  # noqa: BLE001
                    logger.debug("Finans senkron hatası %s: %s", p.external_id, exc)
            db.commit()

    link_players_to_affiliates(db)
    update_click_counts(db)
    recompute_affiliate_aggregates(db)

    result = {
        "ok": True,
        "live": client.configured,
        "fetched": fetched,
        "financial": financial,
        "deep": deep,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    db.add(
        Activity(
            type="sync",
            title="Veri senkronizasyonu",
            description=(
                f"{'Canlı CasinoPera' if client.configured else 'Yerel'} senkron — "
                f"{fetched} oyuncu, {financial} finans kaydı işlendi."
            ),
            actor="system",
        )
    )
    db.commit()
    logger.info("Sync tamamlandı: %s", result)
    return result
