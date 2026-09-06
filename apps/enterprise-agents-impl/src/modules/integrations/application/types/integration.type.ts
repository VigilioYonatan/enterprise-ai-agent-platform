import type {
  IntegrationConnectionSchema,
  IntegrationOauthStateSchema,
} from '../../domain/schemas/integration.schema';

export type OAuthConfig = {
  provider: string;
  authorization_url: string;
  token_url: string;
  revoke_url?: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string;
};

export type OAuthStateRecord = Pick<
  IntegrationOauthStateSchema,
  'organization_id' | 'user_id' | 'code_verifier_ciphertext'
>;

export type StoredConnectionRecord = Pick<
  IntegrationConnectionSchema,
  'access_token_ciphertext' | 'refresh_token_ciphertext' | 'expires_at'
>;

export type ConnectedAccountRecord = Pick<
  IntegrationConnectionSchema,
  | 'id'
  | 'provider'
  | 'granted_scope'
  | 'expires_at'
  | 'created_at'
  | 'updated_at'
>;

export type SaveConnectionInput = Pick<
  IntegrationConnectionSchema,
  | 'organization_id'
  | 'user_id'
  | 'provider'
  | 'access_token_ciphertext'
  | 'refresh_token_ciphertext'
  | 'granted_scope'
  | 'expires_at'
>;
