ALTER TABLE runs ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
