import {
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';
import { runs } from '@/runs/infrastructure/persistence/drizzle/run.table';

export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    run_id: uuid().references(() => runs.id),
    node_id: varchar({ length: 64 }),
    provider: varchar({ length: 64 }).notNull(),
    model: varchar({ length: 120 }).notNull(),
    input_tokens: integer().notNull().default(0),
    output_tokens: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('usage_org_created_idx').on(t.organization_id, t.created_at)],
);
