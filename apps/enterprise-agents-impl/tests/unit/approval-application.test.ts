import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ApprovalRepository } from '../../src/modules/approvals/application/repositories/approval.repository.interface';
import { ApprovalsService } from '../../src/modules/approvals/application/service/approvals.service';
import type { ApprovalRecord } from '../../src/modules/approvals/application/types/approval.type';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';
import type { Actor } from '../../src/shared/auth/actor';

const actor: Actor = {
  sub: 'reviewer',
  email: 'reviewer@example.test',
  email_verified: true,
};
const base: ApprovalRecord = {
  id: 'approval',
  organization_id: 'org',
  run_id: 'run',
  requested_by: 'author',
  status: 'pending',
  expires_at: new Date('2099-01-01T00:00:00.000Z'),
  reason: null,
};
function sut(record: ApprovalRecord | null = base) {
  const decide = vi.fn().mockResolvedValue({ ...record, status: 'approved' });
  const repo: ApprovalRepository = {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(record),
    decide,
  };
  const roleCheck = vi.fn().mockResolvedValue(undefined);
  const organizations = {
    assertRole: roleCheck,
  } as unknown as OrganizationsService;
  return {
    service: new ApprovalsService(repo, organizations),
    decide,
    roleCheck,
  };
}
describe('approval application service and four-eyes boundary', () => {
  it('authorizes and forwards an approval with exact run scope', async () => {
    const { service, roleCheck, decide } = sut();
    await service.decide(actor, 'org', 'approval', 'approved', 'reviewed');
    expect(roleCheck).toHaveBeenCalledWith(actor, 'org', ['owner', 'admin']);
    expect(decide).toHaveBeenCalledWith({
      actor_id: 'reviewer',
      organization_id: 'org',
      approval_id: 'approval',
      decision: 'approved',
      reason: 'reviewed',
    });
  });
  it('rejects self-approval without touching storage transitions', async () => {
    const { service, decide } = sut({ ...base, requested_by: 'reviewer' });
    await expect(
      service.decide(actor, 'org', 'approval', 'approved', ''),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(decide).not.toHaveBeenCalled();
  });
  it('rejects an expired approval and does not transition the run', async () => {
    const { service, decide } = sut({
      ...base,
      expires_at: new Date('2000-01-01T00:00:00Z'),
    });
    await expect(
      service.decide(actor, 'org', 'approval', 'approved', ''),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(decide).not.toHaveBeenCalled();
  });
  it('returns not found for a missing approval', async () => {
    const { service, decide } = sut(null);
    await expect(
      service.decide(actor, 'org', 'missing', 'rejected', ''),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(decide).not.toHaveBeenCalled();
  });
});
