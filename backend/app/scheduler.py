"""Periyodik senkronizasyon — varsayılan: her gece 00:00 (Europe/Istanbul)."""
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
        await run_sync(db, deep=True)
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
    tz = settings.sync_timezone
    _scheduler = AsyncIOScheduler(timezone=tz)

    if settings.sync_mode == "interval":
        interval = max(30, settings.sync_interval_seconds)
        _scheduler.add_job(_sync_job, "interval", seconds=interval, id="player_sync", max_instances=1)
        logger.info("Scheduler başladı — her %ss senkron.", interval)
    else:
        _scheduler.add_job(
            _sync_job,
            "cron",
            hour=settings.sync_cron_hour,
            minute=settings.sync_cron_minute,
            id="player_sync",
            max_instances=1,
        )
        logger.info(
            "Scheduler başladı — her gün %02d:%02d (%s) senkron.",
            settings.sync_cron_hour,
            settings.sync_cron_minute,
            tz,
        )
    _scheduler.start()


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
