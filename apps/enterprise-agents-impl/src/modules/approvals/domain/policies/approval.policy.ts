import type { ApprovalSchema } from '@/approvals/domain/schemas/approval.schema';
import type { UserSchema } from '@/identity/domain/schemas/user.schema';
import type { MembershipSchema } from '@/memberships/domain/schemas/membership.schema';

export function mayDecideApproval(
  role: MembershipSchema['role'],
  approver_id: UserSchema['id'],
  requester_id: UserSchema['id'],
  expires_at: Date,
  status: ApprovalSchema['status'],
): boolean {
  return (
    ['owner', 'admin'].includes(role) &&
    approver_id !== requester_id &&
    status === 'pending' &&
    expires_at.getTime() > Date.now()
  );
}
