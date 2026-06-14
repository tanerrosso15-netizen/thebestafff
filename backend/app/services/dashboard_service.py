"""Gösterge paneli istatistik toplama."""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Affiliate, Player, WithdrawalRequest
from app.services.settings_store import build_referral_link


def _sum(db: Session, column, **filters) -> float:
    q = db.query(func.coalesce(func.sum(column), 0.0))
    return float(q.scalar() or 0.0)


def admin_dashboard(db: Session) -> dict:
    total_balance = float(
        db.query(func.coalesce(func.sum(Player.balance), 0.0)).scalar() or 0.0
    )
    total_deposit = float(
        db.query(func.coalesce(func.sum(Player.deposit_total), 0.0)).scalar() or 0.0
    )
    total_withdrawal = float(
        db.query(func.coalesce(func.sum(Player.withdrawal_total), 0.0)).scalar() or 0.0
    )
    casino_bets = float(db.query(func.coalesce(func.sum(Player.casino_bets), 0.0)).scalar() or 0.0)
    casino_wins = float(db.query(func.coalesce(func.sum(Player.casino_wins), 0.0)).scalar() or 0.0)
    sport_bets = float(db.query(func.coalesce(func.sum(Player.sport_bets), 0.0)).scalar() or 0.0)
    sport_wins = float(db.query(func.coalesce(func.sum(Player.sport_wins), 0.0)).scalar() or 0.0)

    total_players = int(db.query(func.count(Player.id)).scalar() or 0)
    depositing_players = int(
        db.query(func.count(Player.id)).filter(Player.deposit_total > 0).scalar() or 0
    )
    deposit_rate = round((depositing_players / total_players * 100.0), 1) if total_players else 0.0

    # En iyi 5 affiliate (kazanılan komisyona göre)
    top = (
        db.query(Affiliate)
        .order_by(Affiliate.w_commission.desc())
        .limit(5)
        .all()
    )
    top_affiliates = [
        {
            "id": a.id,
            "name": a.name,
            "email": a.email,
            "btag": a.btag,
            "amount": round(a.w_commission, 2),
        }
        for a in top
    ]

    total_affiliates = int(db.query(func.count(Affiliate.id)).scalar() or 0)
    active_affiliates = int(
        db.query(func.count(Affiliate.id)).filter(Affiliate.is_active.is_(True)).scalar() or 0
    )
    pending_withdrawals = int(
        db.query(func.count(WithdrawalRequest.id))
        .filter(WithdrawalRequest.status == "pending")
        .scalar()
        or 0
    )

    diff = total_deposit - total_withdrawal

    return {
        "total_player_balance": round(total_balance, 2),
        "total_deposit": round(total_deposit, 2),
        "total_withdrawal": round(total_withdrawal, 2),
        "diff": round(diff, 2),
        "deposit_rate": deposit_rate,
        "total_players": total_players,
        "depositing_players": depositing_players,
        "casino_bets": round(casino_bets, 2),
        "casino_wins": round(casino_wins, 2),
        "sport_bets": round(sport_bets, 2),
        "sport_wins": round(sport_wins, 2),
        "top_affiliates": top_affiliates,
        "total_affiliates": total_affiliates,
        "active_affiliates": active_affiliates,
        "pending_withdrawals": pending_withdrawals,
        "expenses": {
            "sport_bets": round(sport_bets, 2),
            "sport_wins": round(sport_wins, 2),
            "casino_bets": round(casino_bets, 2),
            "casino_wins": round(casino_wins, 2),
        },
        "finance": {
            "deposits": round(total_deposit, 2),
            "withdrawals": round(total_withdrawal, 2),
            "diff": round(diff, 2),
        },
    }


def affiliate_dashboard(db: Session, affiliate: Affiliate) -> dict:
    players = db.query(Player).filter(Player.affiliate_id == affiliate.id).all()
    total_balance = sum(p.balance for p in players)
    total_deposit = sum(p.deposit_total for p in players)
    total_withdrawal = sum(p.withdrawal_total for p in players)
    depositing = sum(1 for p in players if p.deposit_total > 0)
    total_players = len(players)

    # Alt affiliate'ler (bu affiliate'in getirdiği affiliateler)
    sub_affiliates = db.query(Affiliate).filter(Affiliate.parent_id == affiliate.id).all()

    return {
        "affiliate": {
            "id": affiliate.id,
            "name": affiliate.name,
            "btag": affiliate.btag,
            "commission_rate": affiliate.commission_rate,
            "balance": round(affiliate.balance, 2),
            "w_commission": round(affiliate.w_commission, 2),
            "total_clicks": affiliate.total_clicks,
            "referral_link": build_referral_link(db, affiliate.btag),
        },
        "total_player_balance": round(total_balance, 2),
        "total_deposit": round(total_deposit, 2),
        "total_withdrawal": round(total_withdrawal, 2),
        "net_diff": round(max(0.0, total_deposit - total_withdrawal), 2),
        "total_players": total_players,
        "depositing_players": depositing,
        "deposit_rate": round((depositing / total_players * 100.0), 1) if total_players else 0.0,
        "sub_affiliate_count": len(sub_affiliates),
        "sub_affiliates": [
            {
                "id": s.id,
                "name": s.name,
                "btag": s.btag,
                "total_players": s.total_players,
                "w_commission": round(s.w_commission, 2),
            }
            for s in sub_affiliates
        ],
    }
