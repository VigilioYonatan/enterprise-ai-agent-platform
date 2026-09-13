import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '@/identity/infrastructure/persistence/drizzle/user.table';
import type { NotificationPayloadSchema } from '@/notifications/domain/schemas/notification.schema';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    recipient_id: varchar({ length: 128 })
      .notNull()
      .references(() => users.id),
    kind: varchar({ length: 80 }).notNull(),
    source_event: varchar({ length: 180 }).notNull(),
    payload: jsonb().$type<NotificationPayloadSchema>().notNull().default({}),
    read_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('notifications_org_recipient_event_unique').on(
      t.organization_id,
      t.recipient_id,
      t.source_event,
    ),
    index('notifications_inbox_idx').on(
      t.organization_id,
      t.recipient_id,
      t.created_at,
    ),
  ],
);
