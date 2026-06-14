"""Merkezi yapılandırma — .env üzerinden okunur."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Güvenlik
    secret_key: str = "change-this-to-a-long-random-secret-at-least-32-characters"
    access_token_expire_minutes: int = 720
    algorithm: str = "HS256"

    # Veritabanı (SQLite fallback; ileride MongoDB)
    database_url: str = "sqlite:///./data/affiliate.db"

    # Master admin
    master_admin_name: str = "ADMIN"
    master_admin_email: str = "admin@example.com"
    master_admin_password: str = "change-me-on-first-setup"

    # Marka / panel
    brand_name: str = "Affiliate Panel"
    panel_title: str = "Admin"
    site_name: str = "Platform"

    # Referans linki
    referral_base_url: str = "https://your-platform.example/"

    # Platform backoffice entegrasyonu
    casinopera_enabled: bool = True
    casinopera_base_url: str = "https://backoffice.example/api/v1.0"
    casinopera_site_id: str = "1"
    casinopera_session_cookie: str = ""
    casinopera_session_file: str = "data/platform.cookie"
    platform_api_timeout: int = 30

    # Periyodik senkronizasyon
    sync_interval_seconds: int = 300
    sync_enabled: bool = True
    sync_mode: str = "cron"  # cron | interval
    sync_cron_hour: int = 0  # gece 00:00
    sync_cron_minute: int = 0
    sync_timezone: str = "Europe/Istanbul"

    # Demo veri
    seed_demo_data: bool = True

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
