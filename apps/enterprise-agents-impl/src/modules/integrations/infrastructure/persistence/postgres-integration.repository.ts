import { DrizzleIntegrationRepository } from './drizzle/integration.repository';

/** Backward-compatible export of the integration repository adapter. */
export class PostgresIntegrationRepository extends DrizzleIntegrationRepository {}
