import { SEED_AGENTS } from '@/agents/infrastructure/persistence/drizzle/seeders/agent.seeder';
import { SEED_APPROVALS } from '@/approvals/infrastructure/persistence/drizzle/seeders/approval.seeder';
import type { AuditEventSchema } from '@/audit/domain/schemas/audit-event.schema';
import { SEED_USERS } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import { SEED_KNOWLEDGE } from '@/knowledge/infrastructure/persistence/drizzle/seeders/knowledge.seeder';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { SEED_RUNS } from '@/runs/infrastructure/persistence/drizzle/seeders/run.seeder';
import type { UsageRecordSchema } from '@/usage/domain/schemas/usage.schema';
import { SEED_WORKFLOWS } from '@/workflows/infrastructure/persistence/drizzle/seeders/workflow.seeder';
import { auditEvents, usageRecords } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export class UsageTelemetrySeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const usage_fixtures: Array<{
      id: UsageRecordSchema['id'];
      organization_id: UsageRecordSchema['organization_id'];
      run_id: UsageRecordSchema['run_id'];
      node_id: UsageRecordSchema['node_id'];
      provider: UsageRecordSchema['provider'];
      model: UsageRecordSchema['model'];
      input_tokens: UsageRecordSchema['input_tokens'];
      output_tokens: UsageRecordSchema['output_tokens'];
    }> = [
      {
        id: 'af111111-1111-4111-8111-111111111111',
        organization_id: SEED_ORGS.acme_id,
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'triage',
        provider: 'ollama',
        model: 'qwen2.5:3b',
        input_tokens: 640,
        output_tokens: 1280,
      },
      {
        id: 'af222222-2222-4222-8222-222222222222',
        organization_id: SEED_ORGS.acme_id,
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'lookup',
        provider: 'ollama',
        model: 'nomic-embed-text',
        input_tokens: 412,
        output_tokens: 0,
      },
      {
        id: 'af333333-3333-4333-8333-333333333333',
        organization_id: SEED_ORGS.acme_id,
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'end',
        provider: 'ollama',
        model: 'qwen2.5:3b',
        input_tokens: 920,
        output_tokens: 540,
      },
      {
        id: 'af444444-4444-4444-8444-444444444444',
        organization_id: SEED_ORGS.acme_id,
        run_id: SEED_RUNS.run_active_id,
        node_id: 'start',
        provider: 'ollama',
        model: 'qwen2.5:3b',
        input_tokens: 380,
        output_tokens: 410,
      },
    ];

    for (const fixture of usage_fixtures) {
      await this.db
        .insert(usageRecords)
        .values(fixture)
        .onConflictDoUpdate({
          target: usageRecords.id,
          set: {
            model: fixture.model,
            input_tokens: fixture.input_tokens,
            output_tokens: fixture.output_tokens,
          },
        });
    }

    const audit_fixtures: Array<{
      id: AuditEventSchema['id'];
      organization_id: AuditEventSchema['organization_id'];
      actor_id: AuditEventSchema['actor_id'];
      action: AuditEventSchema['action'];
      resource_id: AuditEventSchema['resource_id'];
      metadata: AuditEventSchema['metadata'];
    }> = [
      {
        id: 'bf111111-1111-4111-8111-111111111111',
        organization_id: SEED_ORGS.acme_id,
        actor_id: SEED_USERS.admin_id,
        action: 'organization.created',
        resource_id: SEED_ORGS.acme_id,
        metadata: { tier: 'enterprise', isolation: 'tenant_rls_strict' },
      },
      {
        id: 'bf222222-2222-4222-8222-222222222222',
        organization_id: SEED_ORGS.acme_id,
        actor_id: SEED_USERS.admin_id,
        action: 'agent.published',
        resource_id: SEED_AGENTS.triage_agent_id,
        metadata: { version: 2, model: 'qwen2.5:3b' },
      },
      {
        id: 'bf333333-3333-4333-8333-333333333333',
        organization_id: SEED_ORGS.acme_id,
        actor_id: SEED_USERS.admin_id,
        action: 'workflow.published',
        resource_id: SEED_WORKFLOWS.triage_workflow_id,
        metadata: { version: 2, nodes: 4 },
      },
      {
        id: 'bf444444-4444-4444-8444-444444444444',
        organization_id: SEED_ORGS.acme_id,
        actor_id: SEED_USERS.admin_id,
        action: 'document.indexed',
        resource_id: SEED_KNOWLEDGE.doc_failover_id,
        metadata: {
          embedding_model: 'nomic-embed-text',
          dimensions: 768,
        },
      },
      {
        id: 'bf555555-5555-4555-8555-555555555555',
        organization_id: SEED_ORGS.acme_id,
        actor_id: SEED_USERS.admin_id,
        action: 'run.completed',
        resource_id: SEED_RUNS.run_completed_id,
        metadata: { ticket_id: 'TCK-9901', sla_elapsed_seconds: 42 },
      },
      {
        id: 'bf666666-6666-4666-8666-666666666666',
        organization_id: SEED_ORGS.acme_id,
        actor_id: SEED_USERS.admin_id,
        action: 'approval.requested',
        resource_id: SEED_APPROVALS.approval_pending_id,
        metadata: {
          tool_key: 'connector.profile.read',
          risk: 'high',
          four_eyes_enforced: true,
        },
      },
    ];

    for (const fixture of audit_fixtures) {
      await this.db
        .insert(auditEvents)
        .values(fixture)
        .onConflictDoUpdate({
          target: auditEvents.id,
          set: {
            action: fixture.action,
            metadata: fixture.metadata,
          },
        });
    }
  }
}
