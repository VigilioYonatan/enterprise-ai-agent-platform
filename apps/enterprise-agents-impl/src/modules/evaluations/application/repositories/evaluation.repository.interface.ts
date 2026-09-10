import type {
  EvaluationRunSchema,
  EvaluationSuiteSchema,
} from '../../domain/schemas/evaluation.schema';
import type { CreateEvaluationSuiteInput } from '../types/evaluation.type';

export interface EvaluationRepository {
  createSuite(
    actor_id: string,
    input: CreateEvaluationSuiteInput,
  ): Promise<EvaluationSuiteSchema>;
  listSuites(
    organization_id: EvaluationSuiteSchema['organization_id'],
  ): Promise<EvaluationSuiteSchema[]>;
  startRun(
    actor_id: string,
    organization_id: EvaluationRunSchema['organization_id'],
    suite_id: EvaluationRunSchema['suite_id'],
  ): Promise<EvaluationRunSchema>;
  listRuns(
    organization_id: EvaluationRunSchema['organization_id'],
  ): Promise<EvaluationRunSchema[]>;
  getRun(
    organization_id: EvaluationRunSchema['organization_id'],
    id: EvaluationRunSchema['id'],
  ): Promise<EvaluationRunSchema | null>;
}

export const EVALUATION_REPOSITORY = Symbol('EVALUATION_REPOSITORY');
