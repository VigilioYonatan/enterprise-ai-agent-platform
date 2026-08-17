-- Worker fencing token prevents stale process commits after lease expiry/reclaim.
ALTER TABLE runs ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS node_id varchar(64);
-- Historical usage may have repeated entries; unique only new run/node entries with node_id populated.
CREATE UNIQUE INDEX IF NOT EXISTS usage_run_node_once ON usage_records(run_id,node_id)
  WHERE run_id IS NOT NULL AND node_id IS NOT NULL;
