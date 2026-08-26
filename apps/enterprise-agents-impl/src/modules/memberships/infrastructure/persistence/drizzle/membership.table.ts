import { index, pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '@/identity/infrastructure/persistence/drizzle/user.table';
import type { MembershipSchema } from '@/memberships/domain/schemas/membership.schema';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const memberships = pgTable(
  'memberships',
  {
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    user_id: varchar({ length: 128 })
      .notNull()
      .references(() => users.id),
    role: varchar({ length: 16 }).$type<MembershipSchema['role']>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organization_id, t.user_id] }),
    index('memberships_user_idx').on(t.user_id),
  ],
);
