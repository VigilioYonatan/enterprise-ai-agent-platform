CREATE TABLE IF NOT EXISTS evaluation_suites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 agent_id uuid NOT NULL REFERENCES agents(id),name varchar(120) NOT NULL,cases jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS eval_suite_org_idx ON evaluation_suites(organization_id);
CREATE TABLE IF NOT EXISTS evaluation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 suite_id uuid NOT NULL REFERENCES evaluation_suites(id),status varchar(24) NOT NULL DEFAULT 'queued'
 CHECK(status IN ('queued','running','completed','failed')),
 results jsonb NOT NULL DEFAULT '[]'::jsonb,passed integer,total integer,error varchar(400),
 created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz);
CREATE INDEX IF NOT EXISTS eval_runs_org_idx ON evaluation_runs(organization_id,created_at DESC);
