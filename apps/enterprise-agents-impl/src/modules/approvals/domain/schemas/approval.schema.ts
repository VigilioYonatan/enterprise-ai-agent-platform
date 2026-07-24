import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../../identity/constants/identity.constants';
import { APPROVAL_CONSTANTS } from '../../constants/approvals.constants';

export const approvalSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  run_id: z.uuid(),
  node_id: z.string().min(1).max(APPROVAL_CONSTANTS.MAX_NODE_ID_LENGTH),
  tool_key: z.string().min(1).max(APPROVAL_CONSTANTS.MAX_TOOL_KEY_LENGTH),
  payload: z.unknown(),
  payload_hash: z.string().length(APPROVAL_CONSTANTS.PAYLOAD_HASH_LENGTH),
  status: z.enum(APPROVAL_CONSTANTS.STATUSES),
  requested_by: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  decided_by: z
    .string()
    .min(1)
    .max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH)
    .nullable(),
  reason: z.string().max(APPROVAL_CONSTANTS.MAX_REASON_LENGTH).nullable(),
  expires_at: z.date(),
  created_at: z.date(),
  decided_at: z.date().nullable(),
});

export type ApprovalSchema = z.infer<typeof approvalSchema>;
