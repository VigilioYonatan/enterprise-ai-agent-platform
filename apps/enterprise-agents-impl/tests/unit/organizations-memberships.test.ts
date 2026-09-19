import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MembershipRepository } from '../../src/modules/memberships/application/repositories/membership.repository.interface';
import { MembershipsService } from '../../src/modules/memberships/application/service/memberships.service';
import type { OrganizationsRepository } from '../../src/modules/organizations/application/repositories/organizations.repository.interface';
import { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';

const actor = {
  sub: 'user-owner',
  email: 'owner@agentops.local',
  email_verified: true,
};
const orgId = '11111111-1111-4111-8111-111111111111';

describe('OrganizationsService & MembershipsService', () => {
  it('handles organization CRUD and role assertions', async () => {
    const repo: OrganizationsRepository = {
      list: vi
        .fn()
        .mockResolvedValue([{ id: orgId, name: 'Acme', role: 'owner' }]),
      get: vi
        .fn()
        .mockResolvedValue({ id: orgId, name: 'Acme', role: 'owner' }),
      create: vi.fn().mockResolvedValue({ id: orgId, name: 'Acme' }),
      update: vi.fn().mockResolvedValue({ id: orgId, name: 'Acme Renamed' }),
      role: vi.fn().mockResolvedValue('owner'),
    };
    const orgs = new OrganizationsService(repo);
    expect(await orgs.list(actor)).toHaveLength(1);
    expect(await orgs.get(actor, orgId)).toMatchObject({ name: 'Acme' });
    expect(await orgs.create(actor, 'Acme')).toMatchObject({ id: orgId });
    expect(await orgs.update(actor, orgId, 'Acme Renamed')).toMatchObject({
      name: 'Acme Renamed',
    });

    await expect(
      orgs.assertMembership(actor, orgId, true),
    ).resolves.toBeUndefined();
    await expect(
      orgs.assertRole(actor, orgId, ['owner', 'admin']),
    ).resolves.toBeUndefined();

    vi.mocked(repo.get).mockResolvedValueOnce(null);
    await expect(orgs.get(actor, orgId)).rejects.toThrow(NotFoundException);

    vi.mocked(repo.update).mockResolvedValueOnce(null);
    await expect(orgs.update(actor, orgId, 'Missing')).rejects.toThrow(
      NotFoundException,
    );

    vi.mocked(repo.role).mockResolvedValueOnce('viewer');
    await expect(orgs.assertMembership(actor, orgId, true)).rejects.toThrow(
      ForbiddenException,
    );

    vi.mocked(repo.role).mockResolvedValueOnce('editor');
    await expect(orgs.assertRole(actor, orgId, ['owner'])).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('delegates membership listing, invitation, role updates, and removal with RBAC checks', async () => {
    const memberRepo: MembershipRepository = {
      list: vi
        .fn()
        .mockResolvedValue([
          { user_id: 'u-1', email: 'u1@agentops.local', role: 'editor' },
        ]),
      add: vi.fn().mockResolvedValue({
        user_id: 'u-2',
        email: 'u2@agentops.local',
        role: 'viewer',
      }),
      changeRole: vi.fn().mockResolvedValue({ user_id: 'u-1', role: 'admin' }),
      remove: vi.fn().mockResolvedValue({ removed: true, user_id: 'u-2' }),
    };
    const orgs = {
      assertMembership: vi.fn().mockResolvedValue(null),
      assertRole: vi.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const service = new MembershipsService(memberRepo, orgs);

    expect(await service.list(actor, orgId)).toHaveLength(1);
    expect(
      await service.add(actor, {
        organization_id: orgId,
        user_id: 'u-2',
        email: 'u2@agentops.local',
        role: 'viewer',
      }),
    ).toMatchObject({ role: 'viewer' });
    expect(
      await service.changeRole(actor, orgId, 'u-1', 'admin'),
    ).toMatchObject({ role: 'admin' });
    expect(await service.remove(actor, orgId, 'u-2')).toEqual({
      removed: true,
      user_id: 'u-2',
    });
    expect(orgs.assertRole).toHaveBeenCalledTimes(3);
  });
});
