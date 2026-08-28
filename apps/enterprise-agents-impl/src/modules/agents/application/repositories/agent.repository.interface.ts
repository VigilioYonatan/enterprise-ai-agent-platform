import type {
  AgentSchema,
  AgentVersionSchema,
} from '../../domain/schemas/agent.schema';
import type {
  CreateAgentInput,
  PublishedAgentResult,
  UpdateAgentChanges,
} from '../types/agent.type';

/** Persistence port owned by Agents. No NestJS/Drizzle/HTTP imports. */
export interface AgentRepository {
  list(organization_id: AgentSchema['organization_id']): Promise<AgentSchema[]>;
  create(input: CreateAgentInput, actor_id: string): Promise<AgentSchema>;
  get(
    organization_id: AgentSchema['organization_id'],
    id: AgentSchema['id'],
  ): Promise<AgentSchema | null>;
  update(
    organization_id: AgentSchema['organization_id'],
    id: AgentSchema['id'],
    revision: AgentSchema['revision'],
    changes: UpdateAgentChanges,
  ): Promise<AgentSchema | null>;
  publish(
    organization_id: AgentSchema['organization_id'],
    id: AgentSchema['id'],
    revision: AgentSchema['revision'],
    actor_id: string,
  ): Promise<PublishedAgentResult | null>;
  archive(
    organization_id: AgentSchema['organization_id'],
    id: AgentSchema['id'],
    revision: AgentSchema['revision'],
    actor_id: string,
  ): Promise<AgentSchema | null>;
  versions(
    organization_id: AgentSchema['organization_id'],
    id: AgentSchema['id'],
  ): Promise<AgentVersionSchema[]>;
}

export const AGENT_REPOSITORY = Symbol('AGENT_REPOSITORY');
