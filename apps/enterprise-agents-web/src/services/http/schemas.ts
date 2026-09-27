import {
  addMemberDto,
  createAgentDto,
  createDocumentDto,
  createEvaluationSuiteDto,
  createKnowledgeBaseDto,
  createOrganizationDto,
  EVALUATION_CONSTANTS,
  searchKnowledgeDto,
  workflowCreateDto,
} from '@enterprise-agents/contracts';
import { z } from 'zod';

export const organizationFormSchema = createOrganizationDto.pick({
  name: true,
});
export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const agentCreateSchema = createAgentDto.pick({
  name: true,
});
export type AgentCreateValues = z.infer<typeof agentCreateSchema>;

export const workflowCreateSchema = workflowCreateDto.pick({
  name: true,
});
export type WorkflowCreateValues = z.infer<typeof workflowCreateSchema>;

export const memberInviteSchema = addMemberDto.omit({
  organization_id: true,
});
export type MemberInviteValues = z.infer<typeof memberInviteSchema>;

export const knowledgeBaseCreateSchema = createKnowledgeBaseDto.pick({
  name: true,
});
export type KnowledgeBaseCreateValues = z.infer<
  typeof knowledgeBaseCreateSchema
>;

export const documentCreateSchema = createDocumentDto.pick({
  title: true,
  content: true,
});
export type DocumentCreateValues = z.infer<typeof documentCreateSchema>;

export const searchFormSchema = searchKnowledgeDto.pick({
  query: true,
});
export type SearchFormValues = z.infer<typeof searchFormSchema>;

export const runStartFormSchema = z.object({
  workflow_id: z.string().min(1, 'Select a published workflow'),
  input_json: z
    .string()
    .min(2)
    .refine(
      (raw) => {
        try {
          const parsed: unknown = JSON.parse(raw);
          return (
            Boolean(parsed) &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          );
        } catch {
          return false;
        }
      },
      { message: 'Input must be a valid JSON object' },
    ),
});
export type RunStartFormValues = z.infer<typeof runStartFormSchema>;

export const evaluationSuiteFormSchema = createEvaluationSuiteDto
  .pick({ name: true })
  .extend({
    agent_id: z.string().min(1, 'Select a published agent'),
    cases_json: z
      .string()
      .min(2)
      .refine(
        (raw) => {
          try {
            const parsed: unknown = JSON.parse(raw);
            return (
              Array.isArray(parsed) &&
              parsed.length >= EVALUATION_CONSTANTS.MIN_CASES &&
              parsed.length <= EVALUATION_CONSTANTS.MAX_CASES
            );
          } catch {
            return false;
          }
        },
        {
          message: `Cases must be a JSON array with ${EVALUATION_CONSTANTS.MIN_CASES} to ${EVALUATION_CONSTANTS.MAX_CASES} items`,
        },
      ),
  });
export type EvaluationSuiteFormValues = z.infer<
  typeof evaluationSuiteFormSchema
>;
