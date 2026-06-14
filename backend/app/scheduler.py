"""Periyodik senkronizasyon — oyuncu verilerini ara ara dinamik kontrol eder."""
from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import SessionLocal
from app.services.sync_service import run_sync

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _sync_job() -> None:
    db = SessionLocal()
    try:
        await run_sync(db)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Periyodik senkron hatası: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    global _scheduler
    if not settings.sync_enabled:
        logger.info("Senkron kapalı (SYNC_ENABLED=false).")
        return
    if _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler(timezone="UTC")
    interval = max(30, settings.sync_interval_seconds)
    _scheduler.add_job(_sync_job, "interval", seconds=interval, id="player_sync", max_instances=1)
    _scheduler.start()
    logger.info("Scheduler başladı — her %ss senkron.", interval)


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
