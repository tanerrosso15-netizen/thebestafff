-- Supabase / PostgreSQL şeması
-- Supabase SQL Editor'da çalıştırın veya DATABASE_URL ile otomatik oluşturulur.

CREATE TABLE IF NOT EXISTS permission_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    infrastructure VARCHAR(60) NOT NULL DEFAULT 'casinopera',
    trial_period VARCHAR(30) NOT NULL DEFAULT 'none',
    fetcher_email VARCHAR(180) NOT NULL DEFAULT '',
    fetcher_password VARCHAR(255) NOT NULL DEFAULT '',
    fetcher_otp_secret VARCHAR(255) NOT NULL DEFAULT '',
    active_domain VARCHAR(255) NOT NULL DEFAULT '',
    active_affiliate_domain VARCHAR(255) NOT NULL DEFAULT '',
    backoffice_url VARCHAR(500) NOT NULL DEFAULT '',
    site_id VARCHAR(30) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users.permission_group_id — mevcut tabloya kolon eklemek için:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_group_id INTEGER REFERENCES permission_groups(id);

CREATE INDEX IF NOT EXISTS idx_users_permission_group ON users(permission_group_id);
CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(is_active);
