import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { WorkflowGraph } from '@/workflows/domain/schemas/workflow.schema';
import { workflows } from '@/workflows/infrastructure/persistence/drizzle/workflow.table';

export const workflowVersions = pgTable(
  'workflow_versions',
  {
    id: uuid().defaultRandom().primaryKey(),
    workflow_id: uuid()
      .notNull()
      .references(() => workflows.id),
    version: integer().notNull(),
    graph: jsonb().$type<WorkflowGraph>().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('workflow_version_unique').on(t.workflow_id, t.version)],
);
