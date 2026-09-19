import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';
import type { RunRepository } from '../../src/modules/runs/application/repositories/run.repository.interface';
import { RunsService } from '../../src/modules/runs/application/service/runs.service';

const actor = {
  sub: 'actor-1',
  email: 'actor@agentops.local',
  email_verified: true,
};
const orgId = '11111111-1111-4111-8111-111111111111';
const workflowId = '22222222-2222-4222-8222-222222222222';
const runId = '33333333-3333-4333-8333-333333333333';

describe('RunsService', () => {
  it('enforces Idempotency-Key, paginates runs, and manages cancel and resume transitions', async () => {
    const repo: RunRepository = {
      start: vi.fn().mockResolvedValue({ id: runId, status: 'queued' }),
      list: vi.fn().mockResolvedValue({ count: 3, results: [{ id: runId }] }),
      get: vi.fn().mockResolvedValue({ id: runId, status: 'running' }),
      steps: vi.fn().mockResolvedValue([{ id: 's-1', node_id: 'start' }]),
      events: vi
        .fn()
        .mockResolvedValue([{ id: 1, event_type: 'run.queued', data: {} }]),
      cancel: vi.fn().mockResolvedValue({ id: runId, status: 'cancelled' }),
      resume: vi.fn().mockResolvedValue({ id: runId, status: 'queued' }),
    };
    const orgs = {
      assertMembership: vi.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const service = new RunsService(repo, orgs);

    await expect(
      service.start(actor, orgId, workflowId, '', {}),
    ).rejects.toThrow(BadRequestException);
    expect(
      await service.start(actor, orgId, workflowId, 'idem-key-1', {
        text: 'hi',
      }),
    ).toMatchObject({ status: 'queued' });

    const page = await service.list(actor, orgId, 1, 1);
    expect(page.next).toContain('offset=2');
    expect(page.previous).toContain('offset=0');

    expect(await service.steps(actor, orgId, runId)).toHaveLength(1);
    expect(await service.events(actor, orgId, runId, 0)).toHaveLength(1);
    expect(await service.cancel(actor, orgId, runId)).toMatchObject({
      status: 'cancelled',
    });
    expect(await service.resume(actor, orgId, runId)).toMatchObject({
      status: 'queued',
    });

    vi.mocked(repo.cancel).mockResolvedValueOnce(null);
    await expect(service.cancel(actor, orgId, runId)).rejects.toThrow(
      ConflictException,
    );

    vi.mocked(repo.resume).mockResolvedValueOnce(null);
    await expect(service.resume(actor, orgId, runId)).rejects.toThrow(
      ConflictException,
    );

    vi.mocked(repo.get).mockResolvedValueOnce(null);
    await expect(service.get(actor, orgId, runId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
