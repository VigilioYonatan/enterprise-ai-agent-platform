ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS lease_until timestamptz;
