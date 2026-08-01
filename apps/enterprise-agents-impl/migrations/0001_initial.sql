CREATE TABLE IF NOT EXISTS users (
 id varchar(128) PRIMARY KEY,
 email varchar(320) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
 organization_id uuid NOT NULL REFERENCES organizations(id),
 user_id varchar(128) NOT NULL REFERENCES users(id),
 role varchar(16) NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
 PRIMARY KEY(organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id);
CREATE TABLE IF NOT EXISTS agents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 name varchar(120) NOT NULL,
 instructions varchar(5000) NOT NULL DEFAULT '',
 status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','archived')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agents_org_idx ON agents(organization_id);
CREATE TABLE IF NOT EXISTS workflows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 name varchar(120) NOT NULL,
 graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
 status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','archived')),
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workflows_org_idx ON workflows(organization_id);
