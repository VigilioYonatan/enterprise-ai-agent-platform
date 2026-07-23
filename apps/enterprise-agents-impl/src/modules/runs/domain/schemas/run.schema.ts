import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../../identity/constants/identity.constants';
import { RUN_CONSTANTS } from '../../constants/runs.constants';

export const runSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  workflow_id: z.uuid(),
  workflow_version_id: z.uuid(),
  created_by: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  status: z.enum(RUN_CONSTANTS.STATUSES),
  idempotency_key: z
    .string()
    .min(1)
    .max(RUN_CONSTANTS.MAX_IDEMPOTENCY_KEY_LENGTH),
  input: z.record(z.string(), z.unknown()),
  context: z.record(z.string(), z.unknown()),
  next_node_id: z.string().max(RUN_CONSTANTS.MAX_NODE_ID_LENGTH).nullable(),
  result: z.unknown(),
  error: z.string().nullable(),
  step_count: z.number().int().nonnegative(),
  retry_count: z.number().int().nonnegative(),
  next_retry_at: z.date().nullable(),
  lease_until: z.date().nullable(),
  lease_token: z.uuid().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type RunSchema = z.infer<typeof runSchema>;

export const runStepSchema = z.object({
  id: z.uuid(),
  run_id: z.uuid(),
  node_id: z.string().min(1).max(RUN_CONSTANTS.MAX_NODE_ID_LENGTH),
  attempt: z.number().int().positive(),
  status: z.enum(RUN_CONSTANTS.STEP_STATUSES),
  output: z.unknown(),
  error: z.string().nullable(),
  created_at: z.date(),
});

export type RunStepSchema = z.infer<typeof runStepSchema>;

export const runEventSchema = z.object({
  id: z.number().int().positive(),
  run_id: z.uuid(),
  event_type: z.string().min(1).max(RUN_CONSTANTS.MAX_EVENT_TYPE_LENGTH),
  data: z.record(z.string(), z.unknown()),
  created_at: z.date(),
});

export type RunEventSchema = z.infer<typeof runEventSchema>;
