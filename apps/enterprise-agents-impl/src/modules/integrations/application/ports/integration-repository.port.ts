import type {
  ConnectedAccountRecord,
  OAuthStateRecord,
  SaveConnectionInput,
  StoredConnectionRecord,
} from '../types/integration.type';

/** Storage contract: connection tokens are ciphertext; repositories never decrypt them. */
export const INTEGRATION_REPOSITORY = Symbol('INTEGRATION_REPOSITORY');

export interface IntegrationRepositoryPort {
  saveState(
    hash: string,
    organization_id: string,
    user_id: string,
    verifier_ciphertext: string,
  ): Promise<void>;
  consumeState(hash: string): Promise<OAuthStateRecord | null>;
  list(
    organization_id: string,
    user_id: string,
  ): Promise<ConnectedAccountRecord[]>;
  saveConnection(connection: SaveConnectionInput): Promise<string>;
  revoke(
    organization_id: string,
    user_id: string,
    id: string,
  ): Promise<boolean>;
  getConnection(
    organization_id: string,
    user_id: string,
    id: string,
  ): Promise<StoredConnectionRecord | null>;
  rotateToken(
    organization_id: string,
    user_id: string,
    id: string,
    access_ciphertext: string,
    refresh_ciphertext: string | null,
    expires_at: Date | null,
  ): Promise<boolean>;
}
