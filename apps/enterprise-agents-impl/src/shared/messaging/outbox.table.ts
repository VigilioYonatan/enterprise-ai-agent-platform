import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid().defaultRandom().primaryKey(),
    subject: varchar({ length: 160 }).notNull(),
    payload: jsonb().notNull(),
    attempts: integer().default(0).notNull(),
    published_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('outbox_unsent_idx').on(t.published_at, t.created_at)],
);
