import { z } from 'zod';
import {
  agentSchema,
  agentVersionSchema,
} from '../../../domain/schemas/agent.schema';

export const agentQueryDto = agentSchema.pick({ organization_id: true });
export type AgentQueryDto = z.output<typeof agentQueryDto>;

export const createAgentDto = agentSchema
  .pick({
    organization_id: true,
    name: true,
  })
  .extend({
    instructions: agentSchema.shape.instructions.default(''),
  })
  .strict();
export type CreateAgentDto = z.output<typeof createAgentDto>;

export const updateAgentDto = agentSchema
  .pick({
    name: true,
    instructions: true,
  })
  .partial()
  .strict()
  .refine((v) => v.name !== undefined || v.instructions !== undefined, {
    message: 'At least one change required',
  });
export type UpdateAgentDto = z.output<typeof updateAgentDto>;

export const agentResponseDto = agentSchema
  .omit({ created_at: true, updated_at: true })
  .extend({
    created_at: z.union([z.date(), z.string()]),
    updated_at: z.union([z.date(), z.string()]),
  });
export type AgentResponseDto = z.output<typeof agentResponseDto>;

export const agentVersionResponseDto = agentVersionSchema
  .omit({ created_at: true })
  .extend({
    created_at: z.union([z.date(), z.string()]),
  });
export type AgentVersionResponseDto = z.output<typeof agentVersionResponseDto>;
