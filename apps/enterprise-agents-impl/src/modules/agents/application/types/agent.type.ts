import type {
  AgentSchema,
  AgentVersionSchema,
} from '../../domain/schemas/agent.schema';

export type CreateAgentInput = Pick<
  AgentSchema,
  'organization_id' | 'name' | 'instructions'
>;

export type UpdateAgentChanges = Partial<
  Pick<AgentSchema, 'name' | 'instructions'>
>;

export type PublishedAgentResult = AgentSchema & {
  published_version: AgentVersionSchema['version'];
};
