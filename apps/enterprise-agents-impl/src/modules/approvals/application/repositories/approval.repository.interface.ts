import type { ApprovalSchema } from '../../domain/schemas/approval.schema';
import type {
  ApprovalRecord,
  DecideApprovalInput,
} from '../types/approval.type';

/** Application port. Repository owns transactional persistence, never actor permissions. */
export const APPROVAL_REPOSITORY = Symbol('APPROVAL_REPOSITORY');

export interface ApprovalRepository {
  list(
    organization_id: ApprovalSchema['organization_id'],
  ): Promise<ApprovalRecord[]>;
  get(
    organization_id: ApprovalSchema['organization_id'],
    approval_id: ApprovalSchema['id'],
  ): Promise<ApprovalRecord | null>;
  decide(input: DecideApprovalInput): Promise<ApprovalRecord>;
}
