import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../../../../database/schema';
import { auditEvents, memberships } from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { UserSchema } from '../../../../identity/domain/schemas/user.schema';
import type { OrganizationSchema } from '../../../../organizations/domain/schemas/organization.schema';
import type { IntegrationRepositoryPort } from '../../../application/ports/integration-repository.port';
import type {
  ConnectedAccountRecord,
  OAuthStateRecord,
  SaveConnectionInput,
  StoredConnectionRecord,
} from '../../../application/types/integration.type';
import type { IntegrationConnectionSchema } from '../../../domain/schemas/integration.schema';
import {
  integrationConnections,
  integrationOauthStates,
} from './integration.table';

/** Drizzle ORM implementation of the integration repository port. */
@Injectable()
export class DrizzleIntegrationRepository implements IntegrationRepositoryPort {
  private readonly db: AppDatabase;

  constructor(@Inject(DB) db_or_pool: AppDatabase | Pool) {
    this.db =
      'connect' in db_or_pool &&
      typeof (db_or_pool as Pool).connect === 'function'
        ? (drizzle(db_or_pool as Pool, { schema }) as AppDatabase)
        : (db_or_pool as AppDatabase);
  }

  async saveState(
    hash: string,
    organization_id: OrganizationSchema['id'],
    user_id: UserSchema['id'],
    verifier_ciphertext: string,
  ): Promise<void> {
    await this.db.insert(integrationOauthStates).values({
      state_hash: hash,
      organization_id,
      user_id,
      code_verifier_ciphertext: verifier_ciphertext,
      expires_at: sql`now() + interval '10 minutes'`,
    });
  }

  async consumeState(hash: string): Promise<OAuthStateRecord | null> {
    const rows = await this.db
      .update(integrationOauthStates)
      .set({ consumed_at: sql`now()` })
      .where(
        and(
          eq(integrationOauthStates.state_hash, hash),
          isNull(integrationOauthStates.consumed_at),
          sql`${integrationOauthStates.expires_at} > now()`,
        ),
      )
      .returning({
        organization_id: integrationOauthStates.organization_id,
        user_id: integrationOauthStates.user_id,
        code_verifier_ciphertext:
          integrationOauthStates.code_verifier_ciphertext,
      });

    return rows[0] ?? null;
  }

  async list(
    organization_id: OrganizationSchema['id'],
    user_id: UserSchema['id'],
  ): Promise<ConnectedAccountRecord[]> {
    const rows = await this.db
      .select({
        id: integrationConnections.id,
        provider: integrationConnections.provider,
        granted_scope: integrationConnections.granted_scope,
        expires_at: integrationConnections.expires_at,
        created_at: integrationConnections.created_at,
        updated_at: integrationConnections.updated_at,
      })
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.organization_id, organization_id),
          eq(integrationConnections.user_id, user_id),
          isNull(integrationConnections.revoked_at),
        ),
      )
      .orderBy(desc(integrationConnections.created_at));

    return rows;
  }

  async saveConnection(input: SaveConnectionInput): Promise<string> {
    return this.db.transaction(async (tx) => {
      const member = await tx
        .select({ organization_id: memberships.organization_id })
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.user_id),
          ),
        )
        .limit(1);

      if (!member.length) {
        throw new ForbiddenException('Organization membership revoked');
      }

      const [saved] = await tx
        .insert(integrationConnections)
        .values({
          organization_id: input.organization_id,
          user_id: input.user_id,
          provider: input.provider,
          access_token_ciphertext: input.access_token_ciphertext,
          refresh_token_ciphertext: input.refresh_token_ciphertext,
          granted_scope: input.granted_scope,
          expires_at: input.expires_at,
        })
        .onConflictDoUpdate({
          target: [
            integrationConnections.organization_id,
            integrationConnections.user_id,
            integrationConnections.provider,
          ],
          set: {
            access_token_ciphertext: sql`excluded.access_token_ciphertext`,
            refresh_token_ciphertext: sql`excluded.refresh_token_ciphertext`,
            granted_scope: sql`excluded.granted_scope`,
            expires_at: sql`excluded.expires_at`,
            revoked_at: null,
            updated_at: sql`now()`,
          },
        })
        .returning({ id: integrationConnections.id });

      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id: input.user_id,
        action: 'integration.connected',
        resource_id: saved.id,
        metadata: {},
      });

      return saved.id;
    });
  }

  async revoke(
    organization_id: OrganizationSchema['id'],
    user_id: UserSchema['id'],
    id: IntegrationConnectionSchema['id'],
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(integrationConnections)
        .set({
          revoked_at: sql`now()`,
          access_token_ciphertext: '',
          refresh_token_ciphertext: null,
        })
        .where(
          and(
            eq(integrationConnections.id, id),
            eq(integrationConnections.organization_id, organization_id),
            eq(integrationConnections.user_id, user_id),
            isNull(integrationConnections.revoked_at),
          ),
        )
        .returning({ id: integrationConnections.id });

      if (!rows.length) {
        return false;
      }

      await tx.insert(auditEvents).values({
        organization_id,
        actor_id: user_id,
        action: 'integration.revoked',
        resource_id: id,
        metadata: {},
      });

      return true;
    });
  }

  async getConnection(
    organization_id: OrganizationSchema['id'],
    user_id: UserSchema['id'],
    id: IntegrationConnectionSchema['id'],
  ): Promise<StoredConnectionRecord | null> {
    const rows = await this.db
      .select({
        access_token_ciphertext: integrationConnections.access_token_ciphertext,
        refresh_token_ciphertext:
          integrationConnections.refresh_token_ciphertext,
        expires_at: integrationConnections.expires_at,
      })
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.organization_id, organization_id),
          eq(integrationConnections.user_id, user_id),
          isNull(integrationConnections.revoked_at),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async rotateToken(
    organization_id: OrganizationSchema['id'],
    user_id: UserSchema['id'],
    id: IntegrationConnectionSchema['id'],
    access_ciphertext: string,
    refresh_ciphertext: string | null,
    expires_at: Date | null,
  ): Promise<boolean> {
    const rows = await this.db
      .update(integrationConnections)
      .set({
        access_token_ciphertext: access_ciphertext,
        refresh_token_ciphertext: sql`coalesce(${refresh_ciphertext}, ${integrationConnections.refresh_token_ciphertext})`,
        expires_at,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.organization_id, organization_id),
          eq(integrationConnections.user_id, user_id),
          isNull(integrationConnections.revoked_at),
        ),
      )
      .returning({ id: integrationConnections.id });

    return rows.length > 0;
  }
}
