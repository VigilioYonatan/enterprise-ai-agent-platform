import type { EvaluationSuiteSchema } from '../../domain/schemas/evaluation.schema';

export type CreateEvaluationSuiteInput = Pick<
  EvaluationSuiteSchema,
  'organization_id' | 'agent_id' | 'name' | 'cases'
>;
