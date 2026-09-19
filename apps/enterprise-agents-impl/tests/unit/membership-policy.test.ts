import { describe, expect, it } from 'vitest';
import {
  canAssignRole,
  canChangeRole,
  canRemoveMember,
} from '@/memberships/domain/policies/membership.policy';

describe('Membership authorization policy', () => {
  it('allows owner to assign, change, and remove any role', () => {
    expect(canChangeRole('owner', 'editor', 'admin')).toBe(true);
    expect(canAssignRole('owner', 'owner')).toBe(true);
    expect(canRemoveMember('owner', 'admin')).toBe(true);
  });

  it('blocks admins escalating privileges or removing owners/admins', () => {
    expect(canChangeRole('admin', 'editor', 'owner')).toBe(false);
    expect(canChangeRole('admin', 'admin', 'viewer')).toBe(false);
    expect(canAssignRole('admin', 'admin')).toBe(false);
    expect(canRemoveMember('admin', 'owner')).toBe(false);
    expect(canRemoveMember('admin', 'admin')).toBe(false);
  });

  it('allows admin to manage editors and viewers', () => {
    expect(canChangeRole('admin', 'editor', 'viewer')).toBe(true);
    expect(canAssignRole('admin', 'editor')).toBe(true);
    expect(canRemoveMember('admin', 'viewer')).toBe(true);
  });

  it('blocks editors and viewers from managing memberships', () => {
    expect(canChangeRole('viewer', 'viewer', 'admin')).toBe(false);
    expect(canAssignRole('editor', 'viewer')).toBe(false);
    expect(canRemoveMember('editor', 'viewer')).toBe(false);
  });
});
