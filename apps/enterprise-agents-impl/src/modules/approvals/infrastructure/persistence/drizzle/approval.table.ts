import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { ApprovalSchema } from '@/approvals/domain/schemas/approval.schema';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';
import { runs } from '@/runs/infrastructure/persistence/drizzle/run.table';

export const approvals = pgTable(
  'approval_requests',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    run_id: uuid()
      .notNull()
      .references(() => runs.id),
    node_id: varchar({ length: 64 }).notNull(),
    tool_key: varchar({ length: 80 }).notNull(),
    payload: jsonb().$type<unknown>().notNull(),
    payload_hash: varchar({ length: 64 }).notNull(),
    status: varchar({ length: 32 })
      .$type<ApprovalSchema['status']>()
      .notNull()
      .default('pending'),
    requested_by: varchar({ length: 128 }).notNull(),
    decided_by: varchar({ length: 128 }),
    reason: text(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    decided_at: timestamp({ withTimezone: true }),
  },
  (t) => [index('approvals_org_status_idx').on(t.organization_id, t.status)],
);
