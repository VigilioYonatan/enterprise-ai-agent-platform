-- A suite is bound to one published agent version and one configured model.
ALTER TABLE evaluation_suites ADD COLUMN IF NOT EXISTS agent_version_id uuid REFERENCES agent_versions(id);
UPDATE evaluation_suites s SET agent_version_id = (
 SELECT av.id FROM agent_versions av WHERE av.agent_id=s.agent_id ORDER BY av.version DESC LIMIT 1
) WHERE agent_version_id IS NULL;
-- Do not silently pin an existing suite to an absent version.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM evaluation_suites WHERE agent_version_id IS NULL)
 THEN RAISE EXCEPTION 'Cannot pin legacy evaluation suite without published version'; END IF; END $$;
ALTER TABLE evaluation_suites ALTER COLUMN agent_version_id SET NOT NULL;
ALTER TABLE evaluation_suites ADD COLUMN IF NOT EXISTS model varchar(120) NOT NULL DEFAULT 'llama3.2:3b';
ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS lease_token uuid;
