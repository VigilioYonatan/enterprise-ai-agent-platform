import type { APPROVAL_CONSTANTS } from '../../constants/approvals.constants';
import type { ApprovalSchema } from '../../domain/schemas/approval.schema';

export type ApprovalDecision = (typeof APPROVAL_CONSTANTS.DECISIONS)[number];

export type ApprovalRecord = Pick<
  ApprovalSchema,
  | 'id'
  | 'organization_id'
  | 'run_id'
  | 'requested_by'
  | 'status'
  | 'expires_at'
  | 'reason'
> &
  Partial<
    Omit<
      ApprovalSchema,
      | 'id'
      | 'organization_id'
      | 'run_id'
      | 'requested_by'
      | 'status'
      | 'expires_at'
      | 'reason'
    >
  >;

export type DecideApprovalInput = {
  actor_id: string;
  organization_id: ApprovalSchema['organization_id'];
  approval_id: ApprovalSchema['id'];
  decision: ApprovalDecision;
  reason: string;
};
