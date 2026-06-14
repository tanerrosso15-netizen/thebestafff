"""SQLAlchemy bağlantısı — SQLite fallback (MongoDB sonra eklenecek).

Repository katmanı session üzerinden çalışır; ileride MongoDB adaptörü
eklemek için servis fonksiyonları DB erişimini soyutlar.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

connect_args = {}
engine_kwargs: dict = {"pool_pre_ping": True}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.database_url.startswith("postgresql"):
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

engine = create_engine(settings.database_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Tabloları oluştur (import sayesinde tüm modeller kayıtlı olmalı)."""
    from pathlib import Path

    from sqlalchemy import inspect, text

    from app import models  # noqa: F401

    if settings.database_url.startswith("sqlite:///"):
        db_file = settings.database_url.replace("sqlite:///", "", 1)
        Path(db_file).parent.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    _migrate_legacy_columns()


def _migrate_legacy_columns() -> None:
    """SQLite/Postgres mevcut DB'ye yeni kolonlar ekle."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    stmts = []
    if "permission_group_id" not in cols:
        stmts.append("ALTER TABLE users ADD COLUMN permission_group_id INTEGER")
    for sql in stmts:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception:
            pass
