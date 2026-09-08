import type { Actor } from '../../../../shared/auth/actor';
import type { ConnectorProfileResult } from '../types/tool.type';

export const CONNECTOR_PROFILE = Symbol('CONNECTOR_PROFILE');

/** Fixed operator-configured read-only OAuth resource, NOT an arbitrary URL request tool. */
export interface ConnectorProfilePort {
  read(
    actor: Actor,
    organization_id: string,
    connection_id: string,
  ): Promise<ConnectorProfileResult>;
}
