-- Explicit per-document ACL: same-tenant membership alone never reveals document content.
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS created_by varchar(128);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'pending';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS index_model varchar(120);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS source_version integer NOT NULL DEFAULT 1;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS indexed_at timestamptz;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS index_error text;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS lease_until timestamptz;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD CONSTRAINT knowledge_status_check CHECK (status IN ('pending','processing','ready','failed'));
CREATE INDEX IF NOT EXISTS knowledge_pending_idx ON knowledge_documents(status,lease_until,created_at);
CREATE TABLE IF NOT EXISTS knowledge_document_acl (
  document_id uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id varchar(128) NOT NULL REFERENCES users(id),
  can_read boolean NOT NULL DEFAULT true,
  granted_by varchar(128) NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(document_id,user_id)
);
CREATE INDEX IF NOT EXISTS knowledge_acl_actor_idx ON knowledge_document_acl(organization_id,user_id) WHERE can_read=true;
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 1500),
  embedding vector(768),
  embedding_model varchar(120) NOT NULL,
  source_version integer NOT NULL CHECK(source_version>0),
  search_text tsvector GENERATED ALWAYS AS (to_tsvector('simple',content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id,source_version,chunk_index)
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_doc_idx ON knowledge_chunks(organization_id,document_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx ON knowledge_chunks USING GIN(search_text);
-- Exact vector retrieval is deliberate; only create HNSW once benchmarked with ACL filters.
-- Historical documents have no owner ACL and remain inaccessible until explicitly repaired.
