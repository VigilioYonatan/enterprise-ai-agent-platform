import type {
  AgentSchema,
  AgentVersionSchema,
} from '@/agents/domain/schemas/agent.schema';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { agents, agentVersions } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_AGENTS = {
  triage_agent_id: 'a1111111-1111-4111-8111-111111111111' as AgentSchema['id'],
  security_agent_id:
    'a2222222-2222-4222-8222-222222222222' as AgentSchema['id'],
  sre_agent_id: 'a3333333-3333-4333-8333-333333333333' as AgentSchema['id'],
};

export class AgentSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const agent_fixtures: Array<{
      id: AgentSchema['id'];
      organization_id: AgentSchema['organization_id'];
      name: AgentSchema['name'];
      instructions: AgentSchema['instructions'];
      status: AgentSchema['status'];
      revision: AgentSchema['revision'];
    }> = [
      {
        id: SEED_AGENTS.triage_agent_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'Customer Triage Agent',
        instructions:
          'Classify user requests and route priority tickets with SLA tracking.',
        status: 'published',
        revision: 2,
      },
      {
        id: SEED_AGENTS.security_agent_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'Security Compliance Auditor',
        instructions:
          'Audit IAM permissions and access logs against SOC2/ISO baseline.',
        status: 'published',
        revision: 1,
      },
      {
        id: SEED_AGENTS.sre_agent_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'SRE Incident Assistant',
        instructions:
          'Analyze telemetry, query vector knowledge runbooks, and draft remediation plans.',
        status: 'draft',
        revision: 1,
      },
    ];

    for (const fixture of agent_fixtures) {
      await this.db
        .insert(agents)
        .values(fixture)
        .onConflictDoUpdate({
          target: agents.id,
          set: {
            name: fixture.name,
            instructions: fixture.instructions,
            status: fixture.status,
            revision: fixture.revision,
          },
        });
    }

    const version_fixtures: Array<{
      id: string;
      agent_id: AgentVersionSchema['agent_id'];
      version: AgentVersionSchema['version'];
      instructions: AgentVersionSchema['instructions'];
    }> = [
      {
        id: 'ba111111-1111-4111-8111-111111111111',
        agent_id: SEED_AGENTS.triage_agent_id,
        version: 1,
        instructions: 'Initial triage instructions.',
      },
      {
        id: 'ba222222-2222-4222-8222-222222222222',
        agent_id: SEED_AGENTS.triage_agent_id,
        version: 2,
        instructions:
          'Classify user requests and route priority tickets with SLA tracking.',
      },
      {
        id: 'ba333333-3333-4333-8333-333333333333',
        agent_id: SEED_AGENTS.security_agent_id,
        version: 1,
        instructions:
          'Audit IAM permissions and access logs against SOC2/ISO baseline.',
      },
    ];

    for (const fixture of version_fixtures) {
      await this.db
        .insert(agentVersions)
        .values(fixture)
        .onConflictDoNothing({ target: agentVersions.id });
    }
  }
}
