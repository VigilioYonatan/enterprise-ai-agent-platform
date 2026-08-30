import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';
import type {
  WorkflowGraph,
  WorkflowSchema,
} from '@/workflows/domain/schemas/workflow.schema';

export const workflows = pgTable(
  'workflows',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    name: varchar({ length: 120 }).notNull(),
    graph: jsonb()
      .$type<WorkflowGraph>()
      .notNull()
      .default({ nodes: [], edges: [] }),
    status: varchar({ length: 16 })
      .$type<WorkflowSchema['status']>()
      .notNull()
      .default('draft'),
    revision: integer().notNull().default(1),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('workflows_org_idx').on(t.organization_id)],
);
