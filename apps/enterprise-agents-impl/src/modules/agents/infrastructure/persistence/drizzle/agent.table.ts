import {
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { AgentSchema } from '@/agents/domain/schemas/agent.schema';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const agents = pgTable(
  'agents',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    name: varchar({ length: 120 }).notNull(),
    instructions: varchar({ length: 5000 }).notNull().default(''),
    status: varchar({ length: 16 })
      .$type<AgentSchema['status']>()
      .notNull()
      .default('draft'),
    revision: integer().notNull().default(1),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('agents_org_idx').on(t.organization_id)],
);
