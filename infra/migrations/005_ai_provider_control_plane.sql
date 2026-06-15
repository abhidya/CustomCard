CREATE TABLE IF NOT EXISTS ai_provider_models (
  id TEXT PRIMARY KEY,
  adapter_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  capability TEXT NOT NULL CHECK (capability IN ('text-chat', 'image-generation')),
  model_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('candidate', 'active', 'blocked', 'deprecated')),
  cost_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
  docs_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE),
  raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_prompt_profiles (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  prompt_purpose TEXT NOT NULL,
  system_prompt_summary TEXT NOT NULL,
  negative_prompt TEXT,
  request_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_contract TEXT NOT NULL,
  pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE),
  raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_route_policies (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused')),
  capability TEXT NOT NULL CHECK (capability IN ('text-chat', 'image-generation')),
  candidate_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_product_score INTEGER NOT NULL CHECK (min_product_score >= 0 AND min_product_score <= 100),
  min_contract_score INTEGER NOT NULL CHECK (min_contract_score >= 0 AND min_contract_score <= 100),
  min_route_reliability_score INTEGER NOT NULL CHECK (min_route_reliability_score >= 0 AND min_route_reliability_score <= 100),
  max_estimated_cost_cents_per_request INTEGER NOT NULL CHECK (max_estimated_cost_cents_per_request >= 0),
  monthly_budget_cents INTEGER NOT NULL CHECK (monthly_budget_cents >= 0),
  rate_limit_per_minute INTEGER NOT NULL CHECK (rate_limit_per_minute >= 0),
  queue_required BOOLEAN NOT NULL DEFAULT TRUE,
  fallback_strategy TEXT NOT NULL CHECK (fallback_strategy IN ('one-step-failover', 'manual-review')),
  customer_error_policy TEXT NOT NULL CHECK (customer_error_policy = 'generic-status-only'),
  admin_change_mode TEXT NOT NULL CHECK (admin_change_mode = 'runtime-config'),
  pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE),
  raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flow_id, policy_version)
);

CREATE TABLE IF NOT EXISTS ai_benchmark_runs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  flow_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'partial', 'blocked')),
  route_policy_id TEXT REFERENCES ai_route_policies(id),
  api_job_id TEXT REFERENCES api_jobs(id),
  provider_call_event_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE),
  raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_benchmark_grades (
  id TEXT PRIMARY KEY,
  benchmark_run_id TEXT NOT NULL REFERENCES ai_benchmark_runs(id),
  reviewer_id TEXT NOT NULL,
  product_score INTEGER CHECK (product_score IS NULL OR (product_score >= 0 AND product_score <= 100)),
  contract_score INTEGER CHECK (contract_score IS NULL OR (contract_score >= 0 AND contract_score <= 100)),
  route_reliability_score INTEGER CHECK (
    route_reliability_score IS NULL OR (route_reliability_score >= 0 AND route_reliability_score <= 100)
  ),
  grade_status TEXT NOT NULL CHECK (grade_status IN ('manual', 'needs-manual-grade', 'failure', 'ai-only')),
  promoted_model_id TEXT REFERENCES ai_provider_models(id),
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE),
  raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_models_adapter ON ai_provider_models(adapter_id, capability, status);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_profiles_flow ON ai_prompt_profiles(flow_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_route_policies_flow ON ai_route_policies(flow_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_benchmark_runs_flow ON ai_benchmark_runs(flow_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_benchmark_grades_run ON ai_benchmark_grades(benchmark_run_id, grade_status);
