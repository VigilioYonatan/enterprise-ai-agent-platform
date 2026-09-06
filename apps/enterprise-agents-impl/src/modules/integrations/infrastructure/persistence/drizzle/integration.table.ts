import {
  char,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '@/identity/infrastructure/persistence/drizzle/user.table';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const integrationOauthStates = pgTable(
  'integration_oauth_states',
  {
    state_hash: char({ length: 64 }).primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    user_id: varchar({ length: 128 })
      .notNull()
      .references(() => users.id),
    code_verifier_ciphertext: text().notNull(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    consumed_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('oauth_states_expiry_idx').on(t.expires_at)],
);

export const integrationConnections = pgTable(
  'integration_connections',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    user_id: varchar({ length: 128 })
      .notNull()
      .references(() => users.id),
    provider: varchar({ length: 80 }).notNull(),
    access_token_ciphertext: text().notNull(),
    refresh_token_ciphertext: text(),
    granted_scope: text().notNull().default(''),
    expires_at: timestamp({ withTimezone: true }),
    revoked_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('connections_org_user_provider_unique').on(
      t.organization_id,
      t.user_id,
      t.provider,
    ),
    index('connections_org_user_idx').on(t.organization_id, t.user_id),
  ],
);
