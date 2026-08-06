ALTER TABLE agents ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
ALTER TABLE agents ADD CONSTRAINT agents_status_check CHECK(status IN ('draft','published','archived'));
CREATE TABLE IF NOT EXISTS agent_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agent_id uuid NOT NULL REFERENCES agents(id),
 version integer NOT NULL CHECK(version>0),instructions varchar(5000) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(agent_id,version));
