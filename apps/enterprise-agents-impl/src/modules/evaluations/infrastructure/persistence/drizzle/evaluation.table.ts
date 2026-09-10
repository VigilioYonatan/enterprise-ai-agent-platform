import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents } from '@/agents/infrastructure/persistence/drizzle/agent.table';
import { agentVersions } from '@/agents/infrastructure/persistence/drizzle/agent-version.table';
import type {
  EvaluationCaseResultSchema,
  EvaluationCaseSchema,
  EvaluationRunSchema,
} from '@/evaluations/domain/schemas/evaluation.schema';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const evaluationSuites = pgTable(
  'evaluation_suites',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    agent_id: uuid()
      .notNull()
      .references(() => agents.id),
    agent_version_id: uuid()
      .notNull()
      .references(() => agentVersions.id),
    model: varchar({ length: 120 }).notNull(),
    name: varchar({ length: 120 }).notNull(),
    cases: jsonb().$type<EvaluationCaseSchema[]>().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('eval_suite_org_idx').on(t.organization_id)],
);

export const evaluationRuns = pgTable(
  'evaluation_runs',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    suite_id: uuid()
      .notNull()
      .references(() => evaluationSuites.id),
    status: varchar({ length: 24 })
      .$type<EvaluationRunSchema['status']>()
      .notNull()
      .default('queued'),
    results: jsonb()
      .$type<EvaluationCaseResultSchema[]>()
      .notNull()
      .default([]),
    passed: integer(),
    total: integer(),
    error: varchar({ length: 400 }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    lease_until: timestamp({ withTimezone: true }),
    lease_token: uuid(),
    finished_at: timestamp({ withTimezone: true }),
  },
  (t) => [index('eval_runs_org_idx').on(t.organization_id, t.created_at)],
);
