import { SEED_AGENTS } from '@/agents/infrastructure/persistence/drizzle/seeders/agent.seeder';
import { SEED_KNOWLEDGE } from '@/knowledge/infrastructure/persistence/drizzle/seeders/knowledge.seeder';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import type {
  WorkflowGraph,
  WorkflowSchema,
} from '@/workflows/domain/schemas/workflow.schema';
import { workflows, workflowVersions } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_WORKFLOWS = {
  triage_workflow_id:
    'b1111111-1111-4111-8111-111111111111' as WorkflowSchema['id'],
  soc2_workflow_id:
    'b2222222-2222-4222-8222-222222222222' as WorkflowSchema['id'],
  triage_version_v1_id: 'ca111111-1111-4111-8111-111111111111',
  triage_version_v2_id: 'ca222222-2222-4222-8222-222222222222',
};

export class WorkflowSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const graph_triage: WorkflowGraph = {
      nodes: [
        {
          id: 'start',
          type: 'start',
          label: 'Start Trigger',
          config: { source: 'pagerduty_webhook', sla_minutes: 15 },
          position: { x: 50, y: 170 },
        },
        {
          id: 'triage',
          type: 'agent',
          label: 'Triage Agent',
          config: {
            agent_id: SEED_AGENTS.triage_agent_id,
            model: 'qwen2.5:3b',
          },
          position: { x: 275, y: 80 },
        },
        {
          id: 'lookup',
          type: 'tool',
          label: 'Vector Search',
          config: {
            tool_key: 'knowledge.search',
            knowledge_base_id: SEED_KNOWLEDGE.kb_sre_id,
          },
          position: { x: 510, y: 220 },
        },
        {
          id: 'end',
          type: 'output',
          label: 'Response Formatted',
          config: { format: 'incident_remediation_plan' },
          position: { x: 750, y: 135 },
        },
      ],
      edges: [
        { source: 'start', target: 'triage' },
        { source: 'triage', target: 'lookup' },
        { source: 'lookup', target: 'end' },
      ],
    };

    const graph_soc2: WorkflowGraph = {
      nodes: [
        {
          id: 'start',
          type: 'start',
          label: 'Audit Trigger',
          config: { schedule: 'daily_soc2_scan' },
          position: { x: 50, y: 165 },
        },
        {
          id: 'audit',
          type: 'agent',
          label: 'Security Auditor',
          config: { agent_id: SEED_AGENTS.security_agent_id },
          position: { x: 280, y: 85 },
        },
        {
          id: 'approval',
          type: 'tool',
          label: 'Sensitive Connector',
          config: {
            tool_key: 'connector.profile.read',
            requires_approval: true,
          },
          position: { x: 520, y: 215 },
        },
        {
          id: 'end',
          type: 'output',
          label: 'Report Generated',
          config: { compliance_standard: 'SOC2_TYPE_II' },
          position: { x: 760, y: 135 },
        },
      ],
      edges: [
        { source: 'start', target: 'audit' },
        { source: 'audit', target: 'approval' },
        { source: 'approval', target: 'end' },
      ],
    };

    const workflow_fixtures: Array<{
      id: WorkflowSchema['id'];
      organization_id: WorkflowSchema['organization_id'];
      name: WorkflowSchema['name'];
      graph: WorkflowGraph;
      status: WorkflowSchema['status'];
      revision: WorkflowSchema['revision'];
    }> = [
      {
        id: SEED_WORKFLOWS.triage_workflow_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'Autonomous Ticket Triage Pipeline',
        graph: graph_triage,
        status: 'published',
        revision: 2,
      },
      {
        id: SEED_WORKFLOWS.soc2_workflow_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'SOC2 Security Verification Flow',
        graph: graph_soc2,
        status: 'draft',
        revision: 1,
      },
    ];

    for (const fixture of workflow_fixtures) {
      await this.db
        .insert(workflows)
        .values(fixture)
        .onConflictDoUpdate({
          target: workflows.id,
          set: {
            name: fixture.name,
            graph: fixture.graph,
            status: fixture.status,
            revision: fixture.revision,
          },
        });
    }

    const version_fixtures = [
      {
        id: SEED_WORKFLOWS.triage_version_v1_id,
        workflow_id: SEED_WORKFLOWS.triage_workflow_id,
        version: 1,
        graph: graph_triage,
      },
      {
        id: SEED_WORKFLOWS.triage_version_v2_id,
        workflow_id: SEED_WORKFLOWS.triage_workflow_id,
        version: 2,
        graph: graph_triage,
      },
    ];

    for (const fixture of version_fixtures) {
      await this.db
        .insert(workflowVersions)
        .values(fixture)
        .onConflictDoUpdate({
          target: workflowVersions.id,
          set: { graph: fixture.graph },
        });
    }
  }
}
