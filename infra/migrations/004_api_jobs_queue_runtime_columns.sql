ALTER TABLE api_jobs
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 25),
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_api_jobs_user_status ON api_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_api_jobs_lease ON api_jobs(status, run_after, created_at);
CREATE INDEX IF NOT EXISTS idx_api_jobs_locked ON api_jobs(locked_at) WHERE status = 'running';
