import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import type { Actor } from '../../../../shared/auth/actor';
import { AgentsService } from '../../../agents/application/service/agents.service';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { ORGANIZATION_CONSTANTS } from '../../../organizations/constants/organizations.constants';
import {
  graphViolations,
  type WorkflowGraph,
} from '../../domain/schemas/workflow.schema';
import {
  WORKFLOW_REPOSITORY,
  type WorkflowRepository,
} from '../repositories/workflow.repository.interface';
import type { UpdateWorkflowChanges } from '../types/workflow.type';

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepository: WorkflowRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly agentsService: AgentsService,
  ) {}

  async list(
    actor: Actor,
    organization_id: string,
    limit: number,
    offset: number,
  ) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const page = await this.workflowRepository.list(
      organization_id,
      limit,
      offset,
    );
    const base = `/api/v1/workflows?organization_id=${organization_id}&limit=${limit}&offset=`;
    return {
      count: page.count,
      next: offset + limit < page.count ? base + (offset + limit) : null,
      previous: offset > 0 ? base + Math.max(0, offset - limit) : null,
      results: page.results,
    };
  }

  async create(actor: Actor, organization_id: string, name: string) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    return this.workflowRepository.create({ organization_id, name });
  }

  async get(actor: Actor, organization_id: string, id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const value = await this.workflowRepository.get(organization_id, id);
    if (!value) throw new NotFoundException('Workflow not found');
    return value;
  }

  async update(
    actor: Actor,
    organization_id: string,
    id: string,
    revision: number,
    changes: UpdateWorkflowChanges,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    if (changes.graph) {
      const problems = graphViolations(changes.graph);
      if (problems.length)
        throw new ConflictException({ code: 'INVALID_GRAPH', problems });
    }
    const result = await this.workflowRepository.update(
      organization_id,
      id,
      revision,
      changes,
    );
    if (!result) {
      await this.get(actor, organization_id, id);
      throw new ConflictException({
        code: 'WORKFLOW_REVISION_CONFLICT',
        message: 'Reload the workflow before saving',
      });
    }
    return result;
  }

  async validate(actor: Actor, organization_id: string, id: string) {
    const workflow = await this.get(actor, organization_id, id);
    const errors = graphViolations(workflow.graph, true);
    return { valid: errors.length === 0, errors };
  }

  async publish(
    actor: Actor,
    organization_id: string,
    id: string,
    expected_revision: number,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const workflow = await this.get(actor, organization_id, id);
    const errors = graphViolations(workflow.graph, true);
    const agent_versions = new Map<string, string>();
    for (const node of workflow.graph.nodes) {
      if (node.type === 'agent') {
        const agent_id = node.config?.agent_id;
        if (
          typeof agent_id !== 'string' ||
          !z.uuid().safeParse(agent_id).success
        ) {
          errors.push(`Invalid agent_id in node ${node.id}`);
          continue;
        }
        const agent = await this.agentsService.get(
          actor,
          organization_id,
          agent_id,
        );
        if (agent.status !== 'published')
          errors.push(`Node ${node.id} must reference a published agent`);
        else {
          const versions = await this.agentsService.versions(
            actor,
            organization_id,
            agent_id,
          );
          if (!versions[0])
            errors.push(`Node ${node.id} has no published agent version`);
          else agent_versions.set(node.id, versions[0].id);
        }
      }
    }
    if (errors.length)
      throw new ConflictException({ code: 'WORKFLOW_INVALID', errors });
    // Bind the published graph to immutable agent versions; never trust client-supplied version IDs.
    const snapshot: WorkflowGraph = {
      ...workflow.graph,
      nodes: workflow.graph.nodes.map((node) =>
        node.type === 'agent'
          ? {
              ...node,
              config: {
                ...node.config,
                agent_version_id: agent_versions.get(node.id),
              },
            }
          : node,
      ),
    };
    const published = await this.workflowRepository.publish(
      organization_id,
      id,
      expected_revision,
      actor.sub,
      snapshot,
    );
    if (!published) {
      throw new ConflictException({
        code: 'WORKFLOW_REVISION_CONFLICT',
        message: 'Workflow has changed or was published',
      });
    }
    return published;
  }

  async archive(
    actor: Actor,
    organization_id: string,
    id: string,
    expected_revision: number,
  ) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    const archived = await this.workflowRepository.archive(
      organization_id,
      id,
      expected_revision,
      actor.sub,
    );
    if (!archived) {
      await this.get(actor, organization_id, id);
      throw new ConflictException({
        code: 'WORKFLOW_REVISION_CONFLICT',
        message: 'Workflow has changed or is already archived',
      });
    }
    return archived;
  }

  async versions(actor: Actor, organization_id: string, id: string) {
    await this.get(actor, organization_id, id);
    return this.workflowRepository.versions(organization_id, id);
  }
}
