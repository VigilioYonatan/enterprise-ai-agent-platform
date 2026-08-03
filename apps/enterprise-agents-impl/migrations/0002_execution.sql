CREATE TABLE IF NOT EXISTS workflow_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workflow_id uuid NOT NULL REFERENCES workflows(id),
 version integer NOT NULL CHECK (version>0),graph jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workflow_id,version));
CREATE TABLE IF NOT EXISTS runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 workflow_id uuid NOT NULL REFERENCES workflows(id),workflow_version_id uuid NOT NULL REFERENCES workflow_versions(id),
 created_by varchar(128) NOT NULL,status varchar(32) NOT NULL DEFAULT 'queued'
 CHECK(status IN ('queued','running','waiting_approval','completed','failed','cancelled')),
 idempotency_key varchar(128) NOT NULL,input jsonb NOT NULL,context jsonb NOT NULL DEFAULT '{}'::jsonb,
 next_node_id varchar(64),result jsonb,error text,step_count integer NOT NULL DEFAULT 0 CHECK(step_count>=0),
 lease_until timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,created_by,idempotency_key));
CREATE INDEX IF NOT EXISTS runs_org_created_idx ON runs(organization_id,created_at DESC);
CREATE INDEX IF NOT EXISTS runs_sched_idx ON runs(status,lease_until);
CREATE TABLE IF NOT EXISTS run_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),run_id uuid NOT NULL REFERENCES runs(id),node_id varchar(64) NOT NULL,
 attempt integer NOT NULL DEFAULT 1,status varchar(32) NOT NULL,output jsonb,error text,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(run_id,node_id,attempt));
CREATE TABLE IF NOT EXISTS run_events (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,run_id uuid NOT NULL REFERENCES runs(id),
 event_type varchar(64) NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS run_events_replay_idx ON run_events(run_id,id);
CREATE TABLE IF NOT EXISTS outbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subject varchar(160) NOT NULL,payload jsonb NOT NULL,
 attempts integer NOT NULL DEFAULT 0,published_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS outbox_unsent_idx ON outbox_events(created_at) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS approval_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 run_id uuid NOT NULL REFERENCES runs(id),node_id varchar(64) NOT NULL,tool_key varchar(80) NOT NULL,
 payload jsonb NOT NULL,payload_hash varchar(64) NOT NULL,status varchar(32) NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','approved','rejected','expired')),
 requested_by varchar(128) NOT NULL,decided_by varchar(128),reason text,
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz);
CREATE INDEX IF NOT EXISTS approvals_org_status_idx ON approval_requests(organization_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS approvals_run_node_unique ON approval_requests(run_id,node_id);
CREATE TABLE IF NOT EXISTS audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 actor_id varchar(128) NOT NULL,action varchar(100) NOT NULL,resource_id varchar(128) NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,occurred_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS audit_org_occurred_idx ON audit_events(organization_id,occurred_at DESC);
CREATE TABLE IF NOT EXISTS knowledge_bases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 name varchar(120) NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS knowledge_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 knowledge_base_id uuid NOT NULL REFERENCES knowledge_bases(id),title varchar(180) NOT NULL,content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS knowledge_documents_tsv_idx ON knowledge_documents USING GIN (to_tsvector('simple',content));
CREATE TABLE IF NOT EXISTS usage_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 run_id uuid REFERENCES runs(id),provider varchar(64) NOT NULL,model varchar(120) NOT NULL,
 input_tokens integer NOT NULL DEFAULT 0,output_tokens integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS usage_org_created_idx ON usage_records(organization_id,created_at DESC);
