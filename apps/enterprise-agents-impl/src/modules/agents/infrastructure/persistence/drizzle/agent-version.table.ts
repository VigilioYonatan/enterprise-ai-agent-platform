import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents } from '@/agents/infrastructure/persistence/drizzle/agent.table';

export const agentVersions = pgTable(
  'agent_versions',
  {
    id: uuid().defaultRandom().primaryKey(),
    agent_id: uuid()
      .notNull()
      .references(() => agents.id),
    version: integer().notNull(),
    instructions: varchar({ length: 5000 }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('agent_version_unique').on(t.agent_id, t.version)],
);
