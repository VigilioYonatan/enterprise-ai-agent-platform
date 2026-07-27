import { z } from 'zod';
import { TOOL_CONSTANTS } from '../../constants/tools.constants';

export const toolSchema = z.object({
  key: z.enum(TOOL_CONSTANTS.KEYS),
  name: z.string().trim().min(2).max(120),
  risk: z.enum(TOOL_CONSTANTS.RISKS),
  description: z.string().trim().min(2).max(500),
});

export type ToolSchema = z.infer<typeof toolSchema>;
