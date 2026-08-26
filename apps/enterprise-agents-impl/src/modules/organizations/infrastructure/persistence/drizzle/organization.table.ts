import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 120 }).notNull(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
