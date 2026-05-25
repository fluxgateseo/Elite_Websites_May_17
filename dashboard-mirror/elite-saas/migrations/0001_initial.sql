CREATE TABLE elite_sites (
  domain TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  status TEXT NOT NULL,
  cloudflare_pages_project TEXT,
  github_repo TEXT,
  agency_email TEXT NOT NULL,
  brief_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE elite_leads (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  messaggio TEXT NOT NULL,
  source_ip TEXT NOT NULL,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notified_at INTEGER,
  received_at INTEGER NOT NULL,
  FOREIGN KEY (domain) REFERENCES elite_sites(domain)
);
CREATE INDEX idx_leads_domain_status ON elite_leads(domain, status);
CREATE INDEX idx_leads_received ON elite_leads(received_at DESC);

CREATE TABLE elite_jobs (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  current_stage TEXT,
  workflow_instance_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX idx_jobs_status ON elite_jobs(status);

CREATE TABLE elite_stage_outputs (
  job_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  output_json TEXT,
  output_r2_key TEXT,
  error TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  PRIMARY KEY (job_id, stage),
  FOREIGN KEY (job_id) REFERENCES elite_jobs(id)
);
