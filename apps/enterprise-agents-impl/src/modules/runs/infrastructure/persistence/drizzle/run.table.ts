import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';
import type {
  RunSchema,
  RunStepSchema,
} from '@/runs/domain/schemas/run.schema';
import { workflows } from '@/workflows/infrastructure/persistence/drizzle/workflow.table';
import { workflowVersions } from '@/workflows/infrastructure/persistence/drizzle/workflow-version.table';

export const runs = pgTable(
  'runs',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    workflow_id: uuid()
      .notNull()
      .references(() => workflows.id),
    workflow_version_id: uuid()
      .notNull()
      .references(() => workflowVersions.id),
    created_by: varchar({ length: 128 }).notNull(),
    status: varchar({ length: 32 })
      .$type<RunSchema['status']>()
      .notNull()
      .default('queued'),
    idempotency_key: varchar({ length: 128 }).notNull(),
    input: jsonb().$type<Record<string, unknown>>().notNull(),
    context: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    next_node_id: varchar({ length: 64 }),
    result: jsonb().$type<unknown>(),
    error: text(),
    step_count: integer().notNull().default(0),
    retry_count: integer().notNull().default(0),
    next_retry_at: timestamp({ withTimezone: true }),
    lease_until: timestamp({ withTimezone: true }),
    lease_token: uuid(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('runs_org_created_idx').on(t.organization_id, t.created_at),
    uniqueIndex('runs_idem_unique').on(
      t.organization_id,
      t.created_by,
      t.idempotency_key,
    ),
  ],
);

export const runSteps = pgTable(
  'run_steps',
  {
    id: uuid().defaultRandom().primaryKey(),
    run_id: uuid()
      .notNull()
      .references(() => runs.id),
    node_id: varchar({ length: 64 }).notNull(),
    attempt: integer().notNull().default(1),
    status: varchar({ length: 32 }).$type<RunStepSchema['status']>().notNull(),
    output: jsonb().$type<unknown>(),
    error: text(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('run_step_dedup').on(t.run_id, t.node_id, t.attempt)],
);

export const runEvents = pgTable(
  'run_events',
  {
    id: integer().generatedAlwaysAsIdentity().primaryKey(),
    run_id: uuid()
      .notNull()
      .references(() => runs.id),
    event_type: varchar({ length: 64 }).notNull(),
    data: jsonb().$type<Record<string, unknown>>().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('run_events_replay_idx').on(t.run_id, t.id)],
);
