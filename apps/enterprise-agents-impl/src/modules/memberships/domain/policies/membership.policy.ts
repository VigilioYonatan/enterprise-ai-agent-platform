import type { MembershipSchema } from '@/memberships/domain/schemas/membership.schema';

export function canChangeRole(
  actor_role: MembershipSchema['role'],
  target_role: MembershipSchema['role'],
  new_role: MembershipSchema['role'],
): boolean {
  if (actor_role === 'owner') return true;
  if (
    actor_role === 'admin' &&
    ['editor', 'viewer'].includes(target_role) &&
    ['editor', 'viewer'].includes(new_role)
  ) {
    return true;
  }
  return false;
}

export function canAssignRole(
  actor_role: MembershipSchema['role'],
  assigned_role: MembershipSchema['role'],
): boolean {
  if (actor_role === 'owner') return true;
  if (actor_role === 'admin' && ['editor', 'viewer'].includes(assigned_role)) {
    return true;
  }
  return false;
}

export function canRemoveMember(
  actor_role: MembershipSchema['role'],
  target_role: MembershipSchema['role'],
): boolean {
  if (actor_role === 'owner') return true;
  if (actor_role === 'admin' && ['editor', 'viewer'].includes(target_role)) {
    return true;
  }
  return false;
}
