-- Additive index for tenant-scoped analytics and tracking history.
-- This migration is committed only; it is not applied to the production database.
CREATE INDEX IF NOT EXISTS prompt_runs_org_project_status_created_at_idx
  ON prompt_runs (organization_id, project_id, status, created_at DESC);
