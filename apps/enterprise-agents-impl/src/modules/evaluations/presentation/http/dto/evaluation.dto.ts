import { z } from 'zod';
import {
  evaluationRunSchema,
  evaluationSuiteSchema,
} from '../../../domain/schemas/evaluation.schema';

export const createEvaluationSuiteDto = evaluationSuiteSchema
  .pick({
    organization_id: true,
    agent_id: true,
    name: true,
    cases: true,
  })
  .strict();
export type CreateEvaluationSuiteDto = z.output<
  typeof createEvaluationSuiteDto
>;

export const evaluationQuery = evaluationSuiteSchema.pick({
  organization_id: true,
});
export type EvaluationQueryDto = z.output<typeof evaluationQuery>;

export const startEvaluationDto = evaluationRunSchema
  .pick({
    organization_id: true,
    suite_id: true,
  })
  .strict();
export type StartEvaluationDto = z.output<typeof startEvaluationDto>;

export const evaluationSuiteResponseDto = evaluationSuiteSchema.pick({
  id: true,
  name: true,
  agent_id: true,
  cases: true,
});
export type EvaluationSuiteResponseDto = z.output<
  typeof evaluationSuiteResponseDto
>;

export const evaluationRunResponseDto = evaluationRunSchema
  .pick({
    id: true,
    status: true,
    passed: true,
    total: true,
    results: true,
    error: true,
  })
  .extend({
    created_at: z.union([z.date(), z.string()]),
  });
export type EvaluationRunResponseDto = z.output<
  typeof evaluationRunResponseDto
>;
