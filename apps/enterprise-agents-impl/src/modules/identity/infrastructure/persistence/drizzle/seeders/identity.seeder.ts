import type { UserSchema } from '@/identity/domain/schemas/user.schema';
import { users } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_USERS = {
  admin_id: '11111111-1111-4111-8111-111111111111' as UserSchema['id'],
  engineer_id: '22222222-2222-4222-8222-222222222222' as UserSchema['id'],
  auditor_id: '33333333-3333-4333-8333-333333333333' as UserSchema['id'],
};

export class UserSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const user_fixtures: Array<{ id: UserSchema['id']; email: string }> = [
      { id: SEED_USERS.admin_id, email: 'admin@agentops.local' },
      { id: SEED_USERS.engineer_id, email: 'engineer@agentops.local' },
      { id: SEED_USERS.auditor_id, email: 'auditor@agentops.local' },
    ];

    for (const fixture of user_fixtures) {
      await this.db
        .insert(users)
        .values(fixture)
        .onConflictDoUpdate({
          target: users.id,
          set: { email: fixture.email },
        });
    }
  }
}
