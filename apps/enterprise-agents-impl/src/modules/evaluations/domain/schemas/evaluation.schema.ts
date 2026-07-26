import { z } from 'zod';
import { EVALUATION_CONSTANTS } from '../../constants/evaluations.constants';

export const evaluationCaseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(EVALUATION_CONSTANTS.MIN_CASE_NAME_LENGTH)
      .max(EVALUATION_CONSTANTS.MAX_CASE_NAME_LENGTH),
    prompt: z
      .string()
      .trim()
      .min(EVALUATION_CONSTANTS.MIN_CASE_PROMPT_LENGTH)
      .max(EVALUATION_CONSTANTS.MAX_CASE_PROMPT_LENGTH),
    expected: z
      .string()
      .trim()
      .max(EVALUATION_CONSTANTS.MAX_CASE_EXPECTED_LENGTH),
  })
  .strict();

export type EvaluationCaseSchema = z.infer<typeof evaluationCaseSchema>;

export const evaluationCaseResultSchema = z.object({
  name: z.string(),
  expected: z.string(),
  actual: z.string(),
  score: z.number(),
});

export type EvaluationCaseResultSchema = z.infer<
  typeof evaluationCaseResultSchema
>;

export const evaluationSuiteSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  agent_id: z.uuid(),
  agent_version_id: z.uuid(),
  model: z.string().min(1).max(EVALUATION_CONSTANTS.MAX_MODEL_LENGTH),
  name: z
    .string()
    .trim()
    .min(EVALUATION_CONSTANTS.MIN_SUITE_NAME_LENGTH, 'Suite name is required')
    .max(EVALUATION_CONSTANTS.MAX_SUITE_NAME_LENGTH),
  cases: z
    .array(evaluationCaseSchema)
    .min(EVALUATION_CONSTANTS.MIN_CASES)
    .max(EVALUATION_CONSTANTS.MAX_CASES),
  created_at: z.date(),
});

export type EvaluationSuiteSchema = z.infer<typeof evaluationSuiteSchema>;

export const evaluationRunSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  suite_id: z.uuid(),
  status: z.enum(EVALUATION_CONSTANTS.RUN_STATUSES),
  results: z.array(evaluationCaseResultSchema),
  passed: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative().nullable(),
  error: z.string().max(EVALUATION_CONSTANTS.MAX_ERROR_LENGTH).nullable(),
  created_at: z.date(),
  lease_until: z.date().nullable(),
  lease_token: z.uuid().nullable(),
  finished_at: z.date().nullable(),
});

export type EvaluationRunSchema = z.infer<typeof evaluationRunSchema>;

export function exactMatchScore(expected: string, actual: string): number {
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  return normalize(expected) === normalize(actual) ? 1 : 0;
}
