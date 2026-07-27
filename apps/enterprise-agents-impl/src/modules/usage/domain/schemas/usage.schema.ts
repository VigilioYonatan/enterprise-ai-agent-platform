import { z } from 'zod';
import { USAGE_CONSTANTS } from '../../constants/usage.constants';

export const usageRecordSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  run_id: z.uuid().nullable(),
  node_id: z.string().max(USAGE_CONSTANTS.MAX_NODE_ID_LENGTH).nullable(),
  provider: z.string().min(1).max(USAGE_CONSTANTS.MAX_PROVIDER_LENGTH),
  model: z.string().min(1).max(USAGE_CONSTANTS.MAX_MODEL_LENGTH),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  created_at: z.date(),
});

export type UsageRecordSchema = z.infer<typeof usageRecordSchema>;
