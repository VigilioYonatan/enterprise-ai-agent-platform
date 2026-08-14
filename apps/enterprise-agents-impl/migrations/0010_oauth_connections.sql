-- Authorization-code + PKCE, one-use states, encrypted tokens, per-user/per-tenant connections.
CREATE TABLE IF NOT EXISTS integration_oauth_states (
 state_hash char(64) PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 user_id varchar(128) NOT NULL REFERENCES users(id),
 code_verifier_ciphertext text NOT NULL,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_states_expiry_idx ON integration_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS integration_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 user_id varchar(128) NOT NULL REFERENCES users(id),
 provider varchar(80) NOT NULL,
 access_token_ciphertext text NOT NULL,
 refresh_token_ciphertext text,
 granted_scope text NOT NULL DEFAULT '',
 expires_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,user_id,provider)
);
CREATE INDEX IF NOT EXISTS connections_org_user_idx ON integration_connections(organization_id,user_id);
