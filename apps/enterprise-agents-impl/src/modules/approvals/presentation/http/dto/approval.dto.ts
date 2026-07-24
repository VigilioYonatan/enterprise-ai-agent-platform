import { z } from 'zod';
import { APPROVAL_CONSTANTS } from '../../../constants/approvals.constants';
import { approvalSchema } from '../../../domain/schemas/approval.schema';

export const approvalQuery = approvalSchema.pick({ organization_id: true });
export type ApprovalQueryDto = z.output<typeof approvalQuery>;

export const approvalDecisionDto = approvalSchema
  .pick({ organization_id: true })
  .extend({
    reason: z
      .string()
      .trim()
      .max(APPROVAL_CONSTANTS.MAX_REASON_LENGTH)
      .default(''),
  })
  .strict();
export type ApprovalDecisionDto = z.output<typeof approvalDecisionDto>;

export const approvalResponseDto = approvalSchema
  .omit({
    expires_at: true,
    created_at: true,
    decided_at: true,
  })
  .extend({
    node_id: approvalSchema.shape.node_id.optional(),
    tool_key: approvalSchema.shape.tool_key.optional(),
    payload: z.unknown().optional(),
    payload_hash: z.string().optional(),
    decided_by: approvalSchema.shape.decided_by.optional(),
    expires_at: z.union([z.date(), z.string()]),
    created_at: z.union([z.date(), z.string()]).optional(),
    decided_at: z.union([z.date(), z.string()]).nullable().optional(),
  });
export type ApprovalResponseDto = z.output<typeof approvalResponseDto>;
