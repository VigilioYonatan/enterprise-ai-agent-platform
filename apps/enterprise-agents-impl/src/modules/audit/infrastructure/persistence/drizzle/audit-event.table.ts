import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    actor_id: varchar({ length: 128 }).notNull(),
    action: varchar({ length: 100 }).notNull(),
    resource_id: varchar({ length: 128 }).notNull(),
    metadata: jsonb().notNull().default({}),
    occurred_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('audit_org_occurred_idx').on(t.organization_id, t.occurred_at)],
);
