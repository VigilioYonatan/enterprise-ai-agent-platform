import { z } from 'zod';
import { membershipSchema } from '../../../../memberships/domain/schemas/membership.schema';
import { TOOL_CONSTANTS } from '../../../constants/tools.constants';
import { toolSchema } from '../../../domain/schemas/tool.schema';

export const toolQueryDto = membershipSchema
  .pick({ organization_id: true })
  .partial();
export type ToolQueryDto = z.output<typeof toolQueryDto>;

export const toolKeyParam = z
  .string()
  .trim()
  .min(1)
  .max(TOOL_CONSTANTS.MAX_FIELD_KEY_LENGTH)
  .regex(/^[a-z0-9.]+$/);

export const toolResponseDto = toolSchema.pick({
  key: true,
  name: true,
  risk: true,
  description: true,
});
export type ToolResponseDto = z.output<typeof toolResponseDto>;
