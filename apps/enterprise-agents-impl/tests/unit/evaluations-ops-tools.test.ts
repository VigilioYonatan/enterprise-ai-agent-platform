import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../../src/modules/audit/application/repositories/audit.repository.interface';
import { AuditService } from '../../src/modules/audit/application/service/audit.service';
import type { EvaluationRepository } from '../../src/modules/evaluations/application/repositories/evaluation.repository.interface';
import { EvaluationsService } from '../../src/modules/evaluations/application/service/evaluations.service';
import type { NotificationRepositoryPort } from '../../src/modules/notifications/application/ports/notification.repository.port';
import { NotificationsService } from '../../src/modules/notifications/application/service/notifications.service';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';
import { ToolsService } from '../../src/modules/tools/application/service/tools.service';
import type { UsageRepository } from '../../src/modules/usage/application/repositories/usage.repository.interface';
import { UsageService } from '../../src/modules/usage/application/service/usage.service';
import { HttpErrorFilter } from '../../src/shared/http/http-exception.filter';

const actor = {
  sub: 'user-1',
  email: 'u1@agentops.local',
  email_verified: true,
};
const orgId = '11111111-1111-4111-8111-111111111111';

describe('Evaluations, Audit, Usage, Notifications, Tools & HttpErrorFilter', () => {
  const orgs = {
    assertMembership: vi.fn().mockResolvedValue(null),
    assertRole: vi.fn().mockResolvedValue(null),
  } as unknown as OrganizationsService;

  it('orchestrates evaluation suites and runs', async () => {
    const repo: EvaluationRepository = {
      createSuite: vi.fn().mockResolvedValue({ id: 's-1', name: 'Regression' }),
      listSuites: vi.fn().mockResolvedValue([{ id: 's-1' }]),
      startRun: vi.fn().mockResolvedValue({ id: 'r-1', status: 'queued' }),
      listRuns: vi.fn().mockResolvedValue([{ id: 'r-1' }]),
      getRun: vi.fn().mockResolvedValue({ id: 'r-1', status: 'completed' }),
    };
    const service = new EvaluationsService(repo, orgs);
    expect(
      await service.createSuite(actor, {
        organization_id: orgId,
        agent_id: orgId,
        name: 'Regression',
        cases: [{ name: 'c1', prompt: 'hi', expected: 'hello' }],
      }),
    ).toMatchObject({ id: 's-1' });
    expect(await service.listSuites(actor, orgId)).toHaveLength(1);
    expect(await service.startRun(actor, orgId, 's-1')).toMatchObject({
      status: 'queued',
    });
    expect(await service.listRuns(actor, orgId)).toHaveLength(1);
    expect(await service.getRun(actor, orgId, 'r-1')).toMatchObject({
      status: 'completed',
    });

    vi.mocked(repo.getRun).mockResolvedValueOnce(null);
    await expect(service.getRun(actor, orgId, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('paginates audit events and summarizes/clamps FinOps usage', async () => {
    const auditRepo: AuditRepository = {
      list: vi.fn().mockResolvedValue({
        count: 10,
        results: [{ id: 'a-1', action: 'agent.published' }],
      }),
    };
    const audit = new AuditService(auditRepo, orgs);
    const page = await audit.list(actor, orgId, 4, 4);
    expect(page.next).toContain('offset=8');
    expect(page.previous).toContain('offset=0');

    const usageRepo: UsageRepository = {
      summarize: vi.fn().mockResolvedValue({
        organization_id: orgId,
        totals: { calls: 1, input_tokens: 10, output_tokens: 20 },
        by_model: [],
      }),
      record: vi.fn().mockResolvedValue(null),
    };
    const usage = new UsageService(usageRepo, orgs);
    const summary = await usage.summary(actor, orgId);
    expect(summary.price_note).toContain('Self-hosted Ollama');

    await usage.record({
      organization_id: orgId,
      run_id: null,
      node_id: null,
      provider: 'ollama',
      model: 'llama3.2:3b',
      input_tokens: -5.7,
      output_tokens: 12.9,
    });
    expect(usageRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({ input_tokens: 0, output_tokens: 12 }),
    );
  });

  it('lists/reads notifications and serves the allowlisted tool catalog', async () => {
    const notifRepo: NotificationRepositoryPort = {
      list: vi.fn().mockResolvedValue([{ id: 'n-1', kind: 'run.completed' }]),
      markRead: vi
        .fn()
        .mockResolvedValue({ id: 'n-1', read_at: new Date().toISOString() }),
    };
    const notifications = new NotificationsService(orgs, notifRepo);
    expect(await notifications.list(actor, orgId)).toHaveLength(1);
    expect(await notifications.markRead(actor, orgId, 'n-1')).toHaveProperty(
      'read_at',
    );

    vi.mocked(notifRepo.markRead).mockResolvedValueOnce(null);
    await expect(
      notifications.markRead(actor, orgId, 'missing'),
    ).rejects.toThrow(NotFoundException);

    const tools = new ToolsService(orgs);
    expect((await tools.list(actor, orgId)).length).toBeGreaterThanOrEqual(5);
    expect((await tools.list(actor)).length).toBeGreaterThanOrEqual(5);
    expect(await tools.getByKey(actor, 'text.uppercase', orgId)).toMatchObject({
      key: 'text.uppercase',
    });
    expect(await tools.getByKey(actor, 'text.uppercase')).toMatchObject({
      key: 'text.uppercase',
    });
    await expect(tools.getByKey(actor, 'shell.exec')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('formats HTTP and unhandled errors into the uniform { code, message, status, trace_id } contract', () => {
    const filter = new HttpErrorFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ request_id: 'req-trace-123' }),
        getResponse: () => ({
          headersSent: false,
          getHeader: () => 'req-trace-123',
          setHeader: vi.fn(),
          status,
        }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(
      new ConflictException({
        code: 'INVALID_GRAPH',
        problems: ['Cycle detected'],
      }),
      host,
    );
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_GRAPH',
        status: 409,
        trace_id: 'req-trace-123',
        problems: ['Cycle detected'],
      }),
    );

    filter.catch(
      new BadRequestException({
        code: 'INVALID_INPUT',
        errors: [{ path: 'name', message: 'Required' }],
      }),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);

    filter.catch(new Error('Unexpected failure'), host);
    expect(status).toHaveBeenCalledWith(500);
  });
});
