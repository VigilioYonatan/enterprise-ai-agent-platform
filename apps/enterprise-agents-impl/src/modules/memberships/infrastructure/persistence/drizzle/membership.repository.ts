import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  canAssignRole,
  canChangeRole,
  canRemoveMember,
} from '@/memberships/domain/policies/membership.policy';
import {
  auditEvents,
  knowledgeDocumentAcl,
  memberships,
  organizations,
  users,
} from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { MembershipRepository } from '../../../application/repositories/membership.repository.interface';
import type {
  AddMemberInput,
  ChangeMemberRoleInput,
  MemberReadModel,
  RemoveMemberInput,
} from '../../../application/types/membership.type';
import type { MembershipSchema } from '../../../domain/schemas/membership.schema';

@Injectable()
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async list(organization_id: string): Promise<MemberReadModel[]> {
    return this.db
      .select({
        user_id: memberships.user_id,
        email: users.email,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.user_id))
      .where(eq(memberships.organization_id, organization_id))
      .orderBy(users.email);
  }

  async add(input: AddMemberInput) {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, input.organization_id))
        .for('update');
      const actor_rows = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.actor_id),
          ),
        )
        .limit(1);
      if (
        !actor_rows[0] ||
        !canAssignRole(
          actor_rows[0].role as MembershipSchema['role'],
          input.role,
        )
      ) {
        throw new ForbiddenException('Insufficient role assignment permission');
      }
      const existing = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.user_id),
          ),
        )
        .limit(1);
      if (existing[0]) {
        throw new ConflictException(
          'User is already a member of this organization',
        );
      }
      await tx
        .insert(users)
        .values({ id: input.user_id, email: input.email })
        .onConflictDoUpdate({
          target: users.id,
          set: { email: input.email },
        });
      const [member] = await tx
        .insert(memberships)
        .values({
          organization_id: input.organization_id,
          user_id: input.user_id,
          role: input.role,
        })
        .returning();
      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id: input.actor_id,
        action: 'membership.added',
        resource_id: input.user_id,
        metadata: { email: input.email, role: input.role },
      });
      return member;
    });
  }

  async changeRole(input: ChangeMemberRoleInput) {
    return this.db.transaction(async (tx) => {
      // Serialize role changes within an organization to preserve the last owner invariant.
      await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, input.organization_id))
        .for('update');
      const rows = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.actor_id),
          ),
        )
        .limit(1);
      const target = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.user_id),
          ),
        )
        .limit(1);
      if (!target[0]) throw new NotFoundException('Member not found');
      if (
        !rows[0] ||
        !canChangeRole(
          rows[0].role as MembershipSchema['role'],
          target[0].role as MembershipSchema['role'],
          input.new_role,
        )
      ) {
        throw new ForbiddenException('Insufficient role assignment permission');
      }
      if (target[0].role === 'owner' && input.new_role !== 'owner') {
        const owners = await tx
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(memberships)
          .where(
            and(
              eq(memberships.organization_id, input.organization_id),
              eq(memberships.role, 'owner'),
            ),
          );
        if ((owners[0]?.count ?? 0) <= 1) {
          throw new ConflictException(
            'An organization must retain at least one owner',
          );
        }
      }
      const [member] = await tx
        .update(memberships)
        .set({ role: input.new_role })
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.user_id),
          ),
        )
        .returning();
      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id: input.actor_id,
        action: 'membership.role_changed',
        resource_id: input.user_id,
        metadata: { old_role: target[0].role, new_role: input.new_role },
      });
      return member;
    });
  }

  async remove(input: RemoveMemberInput): Promise<{ removed: boolean }> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, input.organization_id))
        .for('update');
      const actor_rows = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.actor_id),
          ),
        )
        .limit(1);
      const target = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.user_id),
          ),
        )
        .limit(1);
      if (!target[0]) throw new NotFoundException('Member not found');
      if (
        !actor_rows[0] ||
        !canRemoveMember(
          actor_rows[0].role as MembershipSchema['role'],
          target[0].role as MembershipSchema['role'],
        )
      ) {
        throw new ForbiddenException('Insufficient member removal permission');
      }
      if (target[0].role === 'owner') {
        const owners = await tx
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(memberships)
          .where(
            and(
              eq(memberships.organization_id, input.organization_id),
              eq(memberships.role, 'owner'),
            ),
          );
        if ((owners[0]?.count ?? 0) <= 1) {
          throw new ConflictException(
            'An organization must retain at least one owner',
          );
        }
      }
      await tx
        .delete(knowledgeDocumentAcl)
        .where(
          and(
            eq(knowledgeDocumentAcl.organization_id, input.organization_id),
            eq(knowledgeDocumentAcl.user_id, input.user_id),
          ),
        );
      await tx
        .delete(memberships)
        .where(
          and(
            eq(memberships.organization_id, input.organization_id),
            eq(memberships.user_id, input.user_id),
          ),
        );
      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id: input.actor_id,
        action: 'membership.removed',
        resource_id: input.user_id,
        metadata: { old_role: target[0].role },
      });
      return { removed: true };
    });
  }
}
