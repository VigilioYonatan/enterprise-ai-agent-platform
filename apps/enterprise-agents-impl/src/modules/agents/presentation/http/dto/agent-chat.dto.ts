import { z } from 'zod';
import { AGENT_CONSTANTS } from '../../../constants/agents.constants';
import { agentSchema } from '../../../domain/schemas/agent.schema';

export const agentChatDto = agentSchema
  .pick({ organization_id: true })
  .extend({
    prompt: z
      .string()
      .trim()
      .min(AGENT_CONSTANTS.MIN_CHAT_PROMPT_LENGTH)
      .max(AGENT_CONSTANTS.MAX_CHAT_PROMPT_LENGTH),
  })
  .strict();
export type AgentChatDto = z.output<typeof agentChatDto>;

export const agentChatResponseDto = z.object({
  agent_id: agentSchema.shape.id,
  answer: z.string(),
  model: z.string(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().nullable(),
    output_tokens: z.number().int().nonnegative().nullable(),
  }),
});
export type AgentChatResponseDto = z.output<typeof agentChatResponseDto>;
