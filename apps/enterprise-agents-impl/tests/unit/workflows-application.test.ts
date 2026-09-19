import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AgentsService } from '../../src/modules/agents/application/service/agents.service';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';
import type { WorkflowRepository } from '../../src/modules/workflows/application/repositories/workflow.repository.interface';
import { WorkflowsService } from '../../src/modules/workflows/application/service/workflows.service';

const actor = {
  sub: 'actor-a',
  email: 'actor@example.invalid',
  email_verified: true,
};
const org_id = '11111111-1111-4111-8111-111111111111';
const workflow_id = '22222222-2222-4222-8222-222222222222';
const agent_id = '33333333-3333-4333-8333-333333333333';
const version_id = '44444444-4444-4444-8444-444444444444';

const valid_graph = {
  nodes: [
    { id: 's', type: 'start' as const, label: 'Start' },
    { id: 'o', type: 'output' as const, label: 'End' },
  ],
  edges: [{ source: 's', target: 'o' }],
};

function fixture(
  graph: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<{ source: string; target: string }>;
  } = valid_graph,
) {
  const repository: WorkflowRepository = {
    list: vi
      .fn()
      .mockResolvedValue({ count: 5, results: [{ id: workflow_id }] }),
    create: vi.fn().mockResolvedValue({ id: workflow_id }),
    get: vi.fn().mockResolvedValue({ id: workflow_id, revision: 3, graph }),
    update: vi.fn().mockResolvedValue({ id: workflow_id, revision: 4 }),
    publish: vi.fn().mockResolvedValue({ id: workflow_id, version: 1 }),
    archive: vi
      .fn()
      .mockResolvedValue({ id: workflow_id, status: 'archived', revision: 4 }),
    versions: vi.fn().mockResolvedValue([{ id: version_id, version: 1 }]),
  };
  const organization = {
    assertMembership: vi.fn().mockResolvedValue(null),
    assertRole: vi.fn().mockResolvedValue(null),
  };
  const agents = {
    get: vi.fn().mockResolvedValue({ id: agent_id, status: 'published' }),
    versions: vi.fn().mockResolvedValue([{ id: version_id, version: 1 }]),
  };
  const service = new WorkflowsService(
    repository,
    organization as unknown as OrganizationsService,
    agents as unknown as AgentsService,
  );
  return { service, repository, organization, agents };
}

describe('Workflows use cases against repository ports', () => {
  it('lists workflows with pagination links', async () => {
    const { service } = fixture();
    const page = await service.list(actor, org_id, 2, 2);
    expect(page.count).toBe(5);
    expect(page.next).toContain('offset=4');
    expect(page.previous).toContain('offset=0');
  });

  it('scopes creation to the authenticated tenant and write permission', async () => {
    const { service, repository, organization } = fixture();
    await service.create(actor, org_id, 'Billing approval');
    expect(organization.assertMembership).toHaveBeenCalledWith(
      actor,
      org_id,
      true,
    );
    expect(repository.create).toHaveBeenCalledWith({
      organization_id: org_id,
      name: 'Billing approval',
    });
  });

  it('throws NotFoundException when workflow is absent', async () => {
    const { service, repository } = fixture();
    vi.mocked(repository.get).mockResolvedValueOnce(null);
    await expect(service.get(actor, org_id, workflow_id)).rejects.toThrow(
      'Workflow not found',
    );
  });

  it('validates graph structure and reports validity', async () => {
    const { service } = fixture();
    const result = await service.validate(actor, org_id, workflow_id);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('publishes agent workflow binding immutable agent_version_id', async () => {
    const agentGraph = {
      nodes: [
        { id: 's', type: 'start', label: 'Start' },
        { id: 'a', type: 'agent', label: 'Agent', config: { agent_id } },
        { id: 'o', type: 'output', label: 'End' },
      ],
      edges: [
        { source: 's', target: 'a' },
        { source: 'a', target: 'o' },
      ],
    };
    const { service, repository } = fixture(agentGraph);
    await service.publish(actor, org_id, workflow_id, 3);
    expect(repository.publish).toHaveBeenCalledWith(
      org_id,
      workflow_id,
      3,
      actor.sub,
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'a',
            config: { agent_id, agent_version_id: version_id },
          }),
        ]),
      }),
    );
  });

  it('rejects publish when agent node references draft agent or invalid UUID', async () => {
    const badGraph = {
      nodes: [
        { id: 's', type: 'start', label: 'Start' },
        {
          id: 'a',
          type: 'agent',
          label: 'Agent',
          config: { agent_id: 'not-uuid' },
        },
        { id: 'o', type: 'output', label: 'End' },
      ],
      edges: [
        { source: 's', target: 'a' },
        { source: 'a', target: 'o' },
      ],
    };
    const { service, repository } = fixture(badGraph);
    await expect(
      service.publish(actor, org_id, workflow_id, 3),
    ).rejects.toThrow();
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('rejects a graph cycle before database publication', async () => {
    const graph = {
      nodes: valid_graph.nodes,
      edges: [
        { source: 's', target: 'o' },
        { source: 'o', target: 's' },
      ],
    };
    const { service, repository } = fixture(graph);
    await expect(
      service.publish(actor, org_id, workflow_id, 3),
    ).rejects.toThrow();
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('does not overwrite a concurrent revision on update or archive', async () => {
    const { service, repository } = fixture();
    vi.mocked(repository.update).mockResolvedValue(null);
    await expect(
      service.update(actor, org_id, workflow_id, 2, { name: 'New name' }),
    ).rejects.toThrow();

    vi.mocked(repository.archive).mockResolvedValue(null);
    await expect(
      service.archive(actor, org_id, workflow_id, 2),
    ).rejects.toThrow();
  });

  it('archives workflow with owner/admin authorization and returns versions', async () => {
    const { service, organization } = fixture();
    const archived = await service.archive(actor, org_id, workflow_id, 3);
    expect(organization.assertRole).toHaveBeenCalledWith(actor, org_id, [
      'owner',
      'admin',
    ]);
    expect(archived).toMatchObject({ status: 'archived' });

    const versions = await service.versions(actor, org_id, workflow_id);
    expect(versions).toHaveLength(1);
  });

  it('rejects a publishing attempt without edit permission', async () => {
    const { service, repository, organization } = fixture();
    organization.assertMembership.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(
      service.publish(actor, org_id, workflow_id, 3),
    ).rejects.toThrow('Forbidden');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('verifies agent published state, published versions, and handles concurrent publish conflicts', async () => {
    const graphWithAgent = {
      nodes: [
        { id: 's', type: 'start' as const, label: 'Start' },
        {
          id: 'a1',
          type: 'agent' as const,
          label: 'Bot',
          config: { agent_id },
        },
        { id: 'o', type: 'output' as const, label: 'End' },
      ],
      edges: [
        { source: 's', target: 'a1' },
        { source: 'a1', target: 'o' },
      ],
    };

    // Case 1: referenced agent is still in draft
    const f1 = fixture(graphWithAgent);
    vi.mocked(f1.agents.get).mockResolvedValueOnce({
      id: agent_id,
      status: 'draft',
    } as unknown as Awaited<ReturnType<AgentsService['get']>>);
    await expect(
      f1.service.publish(actor, org_id, workflow_id, 3),
    ).rejects.toSatisfy((err: unknown) => {
      const resp =
        err instanceof ConflictException
          ? (err.getResponse() as Record<string, unknown>)
          : null;
      return (
        Array.isArray(resp?.errors) &&
        resp.errors.some((e: unknown) => String(e).includes('published agent'))
      );
    });

    // Case 2: referenced agent has no versions
    const f2 = fixture(graphWithAgent);
    vi.mocked(f2.agents.versions).mockResolvedValueOnce(
      [] as unknown as Awaited<ReturnType<AgentsService['versions']>>,
    );
    await expect(
      f2.service.publish(actor, org_id, workflow_id, 3),
    ).rejects.toSatisfy((err: unknown) => {
      const resp =
        err instanceof ConflictException
          ? (err.getResponse() as Record<string, unknown>)
          : null;
      return (
        Array.isArray(resp?.errors) &&
        resp.errors.some((e: unknown) =>
          String(e).includes('no published agent version'),
        )
      );
    });

    // Case 3: concurrent publication conflict
    const f3 = fixture(graphWithAgent);
    vi.mocked(f3.repository.publish).mockResolvedValueOnce(null);
    await expect(
      f3.service.publish(actor, org_id, workflow_id, 3),
    ).rejects.toSatisfy((err: unknown) => {
      const resp =
        err instanceof ConflictException
          ? (err.getResponse() as Record<string, unknown>)
          : null;
      return resp?.code === 'WORKFLOW_REVISION_CONFLICT';
    });
  });
});
