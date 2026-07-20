import { z } from 'zod';
import { AGENT_CONSTANTS } from '../../constants/agents.constants';

export const agentSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(
      AGENT_CONSTANTS.MIN_NAME_LENGTH,
      'Agent name must have at least 2 characters',
    )
    .max(AGENT_CONSTANTS.MAX_NAME_LENGTH),
  instructions: z.string().max(AGENT_CONSTANTS.MAX_INSTRUCTIONS_LENGTH),
  status: z.enum(AGENT_CONSTANTS.STATUSES),
  revision: z.number().int().positive(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type AgentSchema = z.infer<typeof agentSchema>;

export const agentVersionSchema = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  version: z.number().int().positive(),
  instructions: z.string().max(AGENT_CONSTANTS.MAX_INSTRUCTIONS_LENGTH),
  created_at: z.date(),
});

export type AgentVersionSchema = z.infer<typeof agentVersionSchema>;
