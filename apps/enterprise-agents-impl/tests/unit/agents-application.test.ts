import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentRepository } from '../../src/modules/agents/application/repositories/agent.repository.interface';
import { AgentChatService } from '../../src/modules/agents/application/service/agent-chat.service';
import { AgentsService } from '../../src/modules/agents/application/service/agents.service';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';
import type { UsageService } from '../../src/modules/usage/application/service/usage.service';

const actor = {
  sub: 'user-1',
  email: 'u1@agentops.local',
  email_verified: true,
};
const orgId = '11111111-1111-4111-8111-111111111111';
const agentId = '22222222-2222-4222-8222-222222222222';

const baseAgent = {
  id: agentId,
  organization_id: orgId,
  name: 'Support Assistant',
  instructions: 'Answer support questions concisely.',
  status: 'draft' as const,
  revision: 1,
  created_by: actor.sub,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('AgentsService & AgentChatService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OLLAMA_URL;
  });

  it('manages agent lifecycle including create, update, publish, archive, and versions', async () => {
    const repo: AgentRepository = {
      list: vi.fn().mockResolvedValue([baseAgent]),
      create: vi.fn().mockResolvedValue(baseAgent),
      get: vi.fn().mockResolvedValue(baseAgent),
      update: vi.fn().mockResolvedValue({ ...baseAgent, revision: 2 }),
      publish: vi.fn().mockResolvedValue({
        ...baseAgent,
        status: 'published',
        revision: 2,
        published_version: 1,
      }),
      archive: vi
        .fn()
        .mockResolvedValue({ ...baseAgent, status: 'archived', revision: 3 }),
      versions: vi.fn().mockResolvedValue([
        {
          id: 'v1',
          agent_id: agentId,
          version: 1,
          instructions: 'Hi',
          created_at: new Date(),
        },
      ]),
    };
    const orgs = {
      assertMembership: vi.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const service = new AgentsService(repo, orgs);

    expect(await service.list(actor, orgId)).toHaveLength(1);
    expect(
      await service.create(actor, {
        organization_id: orgId,
        name: 'Bot',
        instructions: 'Help',
      }),
    ).toMatchObject({ id: agentId });
    expect(
      await service.update(actor, orgId, agentId, 1, { name: 'Bot v2' }),
    ).toMatchObject({ revision: 2 });
    expect(await service.publish(actor, orgId, agentId, 1)).toMatchObject({
      status: 'published',
    });
    expect(await service.archive(actor, orgId, agentId, 2)).toMatchObject({
      status: 'archived',
    });
    expect(await service.versions(actor, orgId, agentId)).toHaveLength(1);

    vi.mocked(repo.get).mockResolvedValueOnce({
      ...baseAgent,
      instructions: '   ',
    });
    await expect(service.publish(actor, orgId, agentId, 1)).rejects.toThrow(
      ConflictException,
    );

    vi.mocked(repo.update).mockResolvedValueOnce(null);
    await expect(
      service.update(actor, orgId, agentId, 99, { name: 'Stale' }),
    ).rejects.toThrow(ConflictException);

    vi.mocked(repo.archive).mockResolvedValueOnce(null);
    await expect(service.archive(actor, orgId, agentId, 99)).rejects.toThrow(
      ConflictException,
    );

    vi.mocked(repo.get).mockResolvedValueOnce(null);
    await expect(service.get(actor, orgId, agentId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('executes chat against Ollama, records token usage, and rejects archived or failing runtimes', async () => {
    const agents = {
      get: vi.fn().mockResolvedValue(baseAgent),
    } as unknown as AgentsService;
    const orgs = {
      assertMembership: vi.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const usage = {
      record: vi.fn().mockResolvedValue(null),
    } as unknown as UsageService;
    const chat = new AgentChatService(agents, orgs, usage);

    await expect(chat.chat(actor, orgId, agentId, 'Hello')).rejects.toThrow(
      ServiceUnavailableException,
    );

    process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: { content: 'Resolved answer' },
          prompt_eval_count: 14,
          eval_count: 22,
        }),
        {
          status: 200,
        },
      ),
    );

    const response = await chat.chat(actor, orgId, agentId, 'Hello');
    expect(response.answer).toBe('Resolved answer');
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: orgId,
        input_tokens: 14,
        output_tokens: 22,
      }),
    );

    vi.mocked(agents.get).mockResolvedValueOnce({
      ...baseAgent,
      status: 'archived',
    });
    await expect(chat.chat(actor, orgId, agentId, 'Hello')).rejects.toThrow(
      ConflictException,
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('error', { status: 503 }),
    );
    await expect(chat.chat(actor, orgId, agentId, 'Hello')).rejects.toThrow(
      ServiceUnavailableException,
    );

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('ECONNREFUSED'),
    );
    await expect(chat.chat(actor, orgId, agentId, 'Hello')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
