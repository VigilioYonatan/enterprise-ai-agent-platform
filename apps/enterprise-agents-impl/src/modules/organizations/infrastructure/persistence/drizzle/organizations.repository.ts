import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  auditEvents,
  memberships,
  organizations,
  users,
} from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { MembershipSchema } from '../../../../memberships/domain/schemas/membership.schema';
import type { OrganizationsRepository } from '../../../application/repositories/organizations.repository.interface';
import type { OrganizationActorInput } from '../../../application/types/organization.type';

@Injectable()
export class DrizzleOrganizationsRepository implements OrganizationsRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async list(sub: string) {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(memberships.organization_id, organizations.id),
      )
      .where(eq(memberships.user_id, sub));
  }

  async get(sub: string, organization_id: string) {
    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(memberships.organization_id, organizations.id),
      )
      .where(
        and(
          eq(memberships.user_id, sub),
          eq(organizations.id, organization_id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async role(
    sub: string,
    organization_id: string,
  ): Promise<MembershipSchema['role'] | null> {
    const rows = await this.db
      .select({ role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.user_id, sub),
          eq(memberships.organization_id, organization_id),
        ),
      )
      .limit(1);
    return rows[0]?.role ?? null;
  }

  async create(actor: OrganizationActorInput, name: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ id: actor.sub, email: actor.email })
        .onConflictDoUpdate({ target: users.id, set: { email: actor.email } });
      const [org] = await tx.insert(organizations).values({ name }).returning();
      await tx.insert(memberships).values({
        user_id: actor.sub,
        organization_id: org.id,
        role: 'owner',
      });
      await tx.insert(auditEvents).values({
        organization_id: org.id,
        actor_id: actor.sub,
        action: 'organization.created',
        resource_id: org.id,
        metadata: { name },
      });
      return { id: org.id, name: org.name, role: 'owner' as const };
    });
  }

  async update(actor_id: string, organization_id: string, name: string) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(organizations)
        .set({ name })
        .where(eq(organizations.id, organization_id))
        .returning({ id: organizations.id, name: organizations.name });
      if (!updated) return null;
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'organization.updated',
        resource_id: organization_id,
        metadata: { name },
      });
      return updated;
    });
  }
}
