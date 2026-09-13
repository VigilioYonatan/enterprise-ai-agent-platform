import { SEED_APPROVALS } from '@/approvals/infrastructure/persistence/drizzle/seeders/approval.seeder';
import { SEED_USERS } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import type { NotificationSchema } from '@/notifications/domain/schemas/notification.schema';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { notifications } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export class NotificationSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const notification_fixtures: Array<{
      id: NotificationSchema['id'];
      organization_id: NotificationSchema['organization_id'];
      recipient_id: NotificationSchema['recipient_id'];
      kind: NotificationSchema['kind'];
      source_event: NotificationSchema['source_event'];
      payload: NotificationSchema['payload'];
      read_at: Date | null;
    }> = [
      {
        id: 'ff111111-1111-4111-8111-111111111111',
        organization_id: SEED_ORGS.acme_id,
        recipient_id: SEED_USERS.admin_id,
        kind: 'approval.requested',
        source_event: 'event-approval-001',
        payload: { approval_id: SEED_APPROVALS.approval_pending_id },
        read_at: null,
      },
      {
        id: 'ff222222-2222-4222-8222-222222222222',
        organization_id: SEED_ORGS.acme_id,
        recipient_id: SEED_USERS.admin_id,
        kind: 'workflow.published',
        source_event: 'event-wf-published-001',
        payload: { workflow_id: 'b1111111-1111-4111-8111-111111111111' },
        read_at: new Date(),
      },
    ];

    for (const fixture of notification_fixtures) {
      await this.db
        .insert(notifications)
        .values(fixture)
        .onConflictDoNothing({ target: notifications.id });
    }
  }
}
