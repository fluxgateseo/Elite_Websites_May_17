-- Migration: multi-tenant foundation (Google-only auth, magic_tokens excluded)
-- Adds users, sessions, user_spend tables.
-- Adds user_id FK to elite_sites, elite_leads, elite_jobs.
-- Andrea's seed admin user inserted at the bottom.

CREATE TABLE elite_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  google_sub TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('admin','member','free')),
  custom_quota_json TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  last_active_at INTEGER
);
CREATE INDEX idx_users_email ON elite_users(email);
CREATE INDEX idx_users_role ON elite_users(role);

CREATE TABLE elite_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES elite_users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  revoked_at INTEGER
);
CREATE INDEX idx_sessions_user ON elite_sessions(user_id);
CREATE INDEX idx_sessions_expires ON elite_sessions(expires_at);

CREATE TABLE elite_user_spend (
  user_id TEXT NOT NULL REFERENCES elite_users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  anthropic_input_tokens INTEGER NOT NULL DEFAULT 0,
  anthropic_output_tokens INTEGER NOT NULL DEFAULT 0,
  anthropic_cost_cents INTEGER NOT NULL DEFAULT 0,
  dataforseo_calls INTEGER NOT NULL DEFAULT 0,
  dataforseo_cost_cents INTEGER NOT NULL DEFAULT 0,
  freepik_calls INTEGER NOT NULL DEFAULT 0,
  unsplash_calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year_month)
);

ALTER TABLE elite_sites ADD COLUMN user_id TEXT REFERENCES elite_users(id);
ALTER TABLE elite_leads ADD COLUMN user_id TEXT REFERENCES elite_users(id);
ALTER TABLE elite_jobs ADD COLUMN user_id TEXT REFERENCES elite_users(id);

CREATE INDEX idx_sites_user ON elite_sites(user_id);
CREATE INDEX idx_leads_user ON elite_leads(user_id);
CREATE INDEX idx_jobs_user ON elite_jobs(user_id);

-- Andrea's seed admin user (id is fixed/deterministic so backfill below works)
INSERT INTO elite_users (id, email, email_verified, role, display_name, created_at)
VALUES (
  '01j0000000andreaabbondanza00',
  'brianzadigitale@gmail.com',
  1,
  'admin',
  'Andrea (admin)',
  CAST(strftime('%s','now') AS INTEGER) * 1000
);

-- Backfill existing rows (the elite-saas DB starts empty in production; this is for safety + dev)
UPDATE elite_sites SET user_id = '01j0000000andreaabbondanza00' WHERE user_id IS NULL;
UPDATE elite_leads SET user_id = '01j0000000andreaabbondanza00' WHERE user_id IS NULL;
UPDATE elite_jobs SET user_id = '01j0000000andreaabbondanza00' WHERE user_id IS NULL;
