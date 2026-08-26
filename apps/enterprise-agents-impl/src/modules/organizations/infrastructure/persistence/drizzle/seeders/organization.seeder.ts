import type { OrganizationSchema } from '@/organizations/domain/schemas/organization.schema';
import { organizations } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_ORGS = {
  acme_id: '11111111-1111-4111-8111-111111111111' as OrganizationSchema['id'],
  fintech_id:
    '22222222-2222-4222-8222-222222222222' as OrganizationSchema['id'],
};

export class OrganizationSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const org_fixtures: Array<{
      id: OrganizationSchema['id'];
      name: OrganizationSchema['name'];
    }> = [
      { id: SEED_ORGS.acme_id, name: 'Acme Enterprise' },
      { id: SEED_ORGS.fintech_id, name: 'FinTech Global Operations' },
    ];

    for (const fixture of org_fixtures) {
      await this.db
        .insert(organizations)
        .values(fixture)
        .onConflictDoUpdate({
          target: organizations.id,
          set: { name: fixture.name },
        });
    }
  }
}
