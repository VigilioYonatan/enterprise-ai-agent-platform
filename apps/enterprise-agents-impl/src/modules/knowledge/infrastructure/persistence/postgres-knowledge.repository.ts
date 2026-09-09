import { DrizzleKnowledgeRepository } from './drizzle/knowledge.repository';

/** Backward-compatible export of the knowledge persistence adapter. */
export class PostgresKnowledgeRepository extends DrizzleKnowledgeRepository {}
