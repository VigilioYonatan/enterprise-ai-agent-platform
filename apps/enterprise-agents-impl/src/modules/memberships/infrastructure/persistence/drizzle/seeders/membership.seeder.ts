import type { UserSchema } from '@/identity/domain/schemas/user.schema';
import { SEED_USERS } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import type { MembershipSchema } from '@/memberships/domain/schemas/membership.schema';
import type { OrganizationSchema } from '@/organizations/domain/schemas/organization.schema';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { memberships } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export class MembershipSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const membership_fixtures: Array<{
      organization_id: OrganizationSchema['id'];
      user_id: UserSchema['id'];
      role: MembershipSchema['role'];
    }> = [
      {
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.admin_id,
        role: 'owner',
      },
      {
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.engineer_id,
        role: 'editor',
      },
      {
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.auditor_id,
        role: 'viewer',
      },
      {
        organization_id: SEED_ORGS.fintech_id,
        user_id: SEED_USERS.engineer_id,
        role: 'admin',
      },
      {
        organization_id: SEED_ORGS.fintech_id,
        user_id: SEED_USERS.auditor_id,
        role: 'viewer',
      },
    ];

    for (const fixture of membership_fixtures) {
      await this.db
        .insert(memberships)
        .values(fixture)
        .onConflictDoUpdate({
          target: [memberships.organization_id, memberships.user_id],
          set: { role: fixture.role },
        });
    }
  }
}
