import { SEED_USERS } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import type {
  RunSchema,
  RunStepSchema,
} from '@/runs/domain/schemas/run.schema';
import { SEED_WORKFLOWS } from '@/workflows/infrastructure/persistence/drizzle/seeders/workflow.seeder';
import { runSteps, runs } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_RUNS = {
  run_completed_id: 'da111111-1111-4111-8111-111111111111' as RunSchema['id'],
  run_active_id: 'da222222-2222-4222-8222-222222222222' as RunSchema['id'],
};

export class RunSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const run_fixtures: Array<{
      id: RunSchema['id'];
      organization_id: RunSchema['organization_id'];
      workflow_id: RunSchema['workflow_id'];
      workflow_version_id: RunSchema['workflow_version_id'];
      created_by: RunSchema['created_by'];
      status: RunSchema['status'];
      idempotency_key: RunSchema['idempotency_key'];
      input: Record<string, unknown>;
      context: Record<string, unknown>;
      result: Record<string, unknown> | null;
      step_count: number;
    }> = [
      {
        id: SEED_RUNS.run_completed_id,
        organization_id: SEED_ORGS.acme_id,
        workflow_id: SEED_WORKFLOWS.triage_workflow_id,
        workflow_version_id: SEED_WORKFLOWS.triage_version_v2_id,
        created_by: SEED_USERS.admin_id,
        status: 'completed',
        idempotency_key: 'idem-run-001',
        input: {
          ticket_id: 'TCK-9901',
          severity: 'P1-Critical',
          service: 'postgres-primary-eu-west',
        },
        context: {
          category: 'database_failover',
          retrieval_mode: 'hybrid_pgvector_fts_rrf',
          matched_runbook: 'PostgreSQL Failover & Disaster Recovery Playbook',
        },
        result: {
          resolution: 'resolved',
          promoted_replica: 'pg-standby-eu-west-2b',
          sla_elapsed_seconds: 42,
        },
        step_count: 4,
      },
      {
        id: SEED_RUNS.run_active_id,
        organization_id: SEED_ORGS.acme_id,
        workflow_id: SEED_WORKFLOWS.triage_workflow_id,
        workflow_version_id: SEED_WORKFLOWS.triage_version_v2_id,
        created_by: SEED_USERS.admin_id,
        status: 'waiting_approval',
        idempotency_key: 'idem-run-002',
        input: {
          ticket_id: 'TCK-9902',
          severity: 'P1-Security',
          connector: 'github-enterprise-org-iam',
        },
        context: {
          category: 'security_audit',
          gate: 'four_eyes_sha256_payload_lock',
        },
        result: null,
        step_count: 2,
      },
    ];

    for (const fixture of run_fixtures) {
      await this.db
        .insert(runs)
        .values(fixture)
        .onConflictDoUpdate({
          target: runs.id,
          set: {
            status: fixture.status,
            workflow_id: fixture.workflow_id,
            workflow_version_id: fixture.workflow_version_id,
            input: fixture.input,
            context: fixture.context,
            result: fixture.result,
            step_count: fixture.step_count,
            lease_until: null,
            lease_token: null,
          },
        });
    }

    const step_fixtures: Array<{
      id: RunStepSchema['id'];
      run_id: RunStepSchema['run_id'];
      node_id: RunStepSchema['node_id'];
      attempt: RunStepSchema['attempt'];
      status: RunStepSchema['status'];
      output: Record<string, unknown>;
    }> = [
      {
        id: 'ea111111-1111-4111-8111-111111111111',
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'start',
        attempt: 1,
        status: 'completed',
        output: { trigger: 'pagerduty_webhook', ticket_id: 'TCK-9901' },
      },
      {
        id: 'ea222222-2222-4222-8222-222222222222',
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'triage',
        attempt: 1,
        status: 'completed',
        output: {
          classified: 'database_failover',
          confidence: 0.98,
          model: 'qwen2.5:3b',
        },
      },
      {
        id: 'ea333333-3333-4333-8333-333333333333',
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'lookup',
        attempt: 1,
        status: 'completed',
        output: {
          tool_key: 'knowledge.search',
          mode: 'hybrid_pgvector_fts_rrf',
          top_document: 'PostgreSQL Failover & Disaster Recovery Playbook',
          rrf_score: 0.0328,
        },
      },
      {
        id: 'ea444444-4444-4444-8444-444444444444',
        run_id: SEED_RUNS.run_completed_id,
        node_id: 'end',
        attempt: 1,
        status: 'completed',
        output: {
          remediation_dispatched: true,
          standby_replica: 'pg-standby-eu-west-2b',
        },
      },
      {
        id: 'ea555555-5555-4555-8555-555555555555',
        run_id: SEED_RUNS.run_active_id,
        node_id: 'start',
        attempt: 1,
        status: 'completed',
        output: { trigger: 'soc2_iam_alert', ticket_id: 'TCK-9902' },
      },
      {
        id: 'ea666666-6666-4666-8666-666666666666',
        run_id: SEED_RUNS.run_active_id,
        node_id: 'triage',
        attempt: 1,
        status: 'completed',
        output: {
          classified: 'iam_privilege_review',
          next_gate: 'connector.profile.read',
        },
      },
    ];

    for (const fixture of step_fixtures) {
      await this.db
        .insert(runSteps)
        .values(fixture)
        .onConflictDoUpdate({
          target: runSteps.id,
          set: {
            status: fixture.status,
            output: fixture.output,
          },
        });
    }
  }
}
