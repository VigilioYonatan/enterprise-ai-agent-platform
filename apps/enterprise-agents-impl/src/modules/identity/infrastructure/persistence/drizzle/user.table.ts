import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar({ length: 128 }).primaryKey(),
  email: varchar({ length: 320 }).notNull(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
