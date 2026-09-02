import type { ApprovalSchema } from '@/approvals/domain/schemas/approval.schema';
import { SEED_USERS } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { SEED_RUNS } from '@/runs/infrastructure/persistence/drizzle/seeders/run.seeder';
import { approvals } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_APPROVALS = {
  approval_pending_id:
    'fa111111-1111-4111-8111-111111111111' as ApprovalSchema['id'],
  approval_approved_id:
    'fa222222-2222-4222-8222-222222222222' as ApprovalSchema['id'],
};

export class ApprovalSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const approval_fixtures: Array<{
      id: ApprovalSchema['id'];
      organization_id: ApprovalSchema['organization_id'];
      run_id: ApprovalSchema['run_id'];
      node_id: ApprovalSchema['node_id'];
      tool_key: ApprovalSchema['tool_key'];
      payload: Record<string, unknown>;
      payload_hash: ApprovalSchema['payload_hash'];
      status: ApprovalSchema['status'];
      requested_by: ApprovalSchema['requested_by'];
      expires_at: Date;
    }> = [
      {
        id: SEED_APPROVALS.approval_pending_id,
        organization_id: SEED_ORGS.acme_id,
        run_id: SEED_RUNS.run_active_id,
        node_id: 'approval',
        tool_key: 'connector.profile.read',
        payload: { scope: 'customer_pii' },
        payload_hash:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 'pending',
        requested_by: SEED_USERS.engineer_id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        id: SEED_APPROVALS.approval_approved_id,
        organization_id: SEED_ORGS.acme_id,
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'audit',
        tool_key: 'text.uppercase',
        payload: { text: 'test' },
        payload_hash:
          '09f7e02f1290be211da707a266f153b3db6b4b3d0fa9364304edc107e33e1b52',
        status: 'approved',
        requested_by: SEED_USERS.engineer_id,
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    ];

    for (const fixture of approval_fixtures) {
      await this.db
        .insert(approvals)
        .values(fixture)
        .onConflictDoUpdate({
          target: approvals.id,
          set: {
            status: fixture.status,
            expires_at: fixture.expires_at,
            decided_by: null,
            decided_at: null,
            reason: null,
          },
        });
    }
  }
}
