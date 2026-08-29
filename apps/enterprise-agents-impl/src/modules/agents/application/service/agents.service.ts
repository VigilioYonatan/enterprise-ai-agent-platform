import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import {
  AGENT_REPOSITORY,
  type AgentRepository,
} from '../repositories/agent.repository.interface';
import type { CreateAgentInput, UpdateAgentChanges } from '../types/agent.type';

/** Application use cases: authz and business invariants, no SQL or Drizzle. */
@Injectable()
export class AgentsService {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepository: AgentRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.agentRepository.list(organization_id);
  }

  async create(actor: Actor, input: CreateAgentInput) {
    await this.organizationsService.assertMembership(
      actor,
      input.organization_id,
      true,
    );
    return this.agentRepository.create(input, actor.sub);
  }

  async get(actor: Actor, organization_id: string, id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const agent = await this.agentRepository.get(organization_id, id);
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async update(
    actor: Actor,
    organization_id: string,
    id: string,
    revision: number,
    changes: UpdateAgentChanges,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const updated = await this.agentRepository.update(
      organization_id,
      id,
      revision,
      changes,
    );
    if (!updated) {
      await this.get(actor, organization_id, id);
      throw new ConflictException(
        'Agent version changed or is already archived',
      );
    }
    return updated;
  }

  async publish(
    actor: Actor,
    organization_id: string,
    id: string,
    revision: number,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const current = await this.get(actor, organization_id, id);
    if (!current.instructions.trim()) {
      throw new ConflictException('Published agent requires instructions');
    }
    const published = await this.agentRepository.publish(
      organization_id,
      id,
      revision,
      actor.sub,
    );
    if (!published) {
      const rechecked = await this.get(actor, organization_id, id);
      if (!rechecked.instructions.trim()) {
        throw new ConflictException('Published agent requires instructions');
      }
      throw new ConflictException('Agent was modified or already archived');
    }
    return published;
  }

  async archive(
    actor: Actor,
    organization_id: string,
    id: string,
    revision: number,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const archived = await this.agentRepository.archive(
      organization_id,
      id,
      revision,
      actor.sub,
    );
    if (!archived) {
      await this.get(actor, organization_id, id);
      throw new ConflictException('Agent was modified or already archived');
    }
    return archived;
  }

  async versions(actor: Actor, organization_id: string, id: string) {
    await this.get(actor, organization_id, id);
    return this.agentRepository.versions(organization_id, id);
  }
}
