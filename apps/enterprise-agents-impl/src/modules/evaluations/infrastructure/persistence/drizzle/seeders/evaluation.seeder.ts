import { SEED_AGENTS } from '@/agents/infrastructure/persistence/drizzle/seeders/agent.seeder';
import type {
  EvaluationCaseResultSchema,
  EvaluationCaseSchema,
  EvaluationRunSchema,
  EvaluationSuiteSchema,
} from '@/evaluations/domain/schemas/evaluation.schema';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { evaluationRuns, evaluationSuites } from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_EVALUATIONS = {
  suite_id:
    'fd111111-1111-4111-8111-111111111111' as EvaluationSuiteSchema['id'],
  run_id: 'fe111111-1111-4111-8111-111111111111' as EvaluationRunSchema['id'],
};

export class EvaluationSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const cases: EvaluationCaseSchema[] = [
      {
        name: 'triage_billing',
        prompt: 'I was double charged on invoice #442',
        expected: 'billing_support',
      },
      {
        name: 'triage_tech',
        prompt: 'Server returning HTTP 500 on checkout',
        expected: 'engineering_sre',
      },
    ];

    await this.db
      .insert(evaluationSuites)
      .values({
        id: SEED_EVALUATIONS.suite_id,
        organization_id: SEED_ORGS.acme_id,
        agent_id: SEED_AGENTS.triage_agent_id,
        agent_version_id: 'ba222222-2222-4222-8222-222222222222',
        model: 'llama3.2:3b',
        name: 'Customer Triage Accuracy Benchmark',
        cases,
      })
      .onConflictDoUpdate({
        target: evaluationSuites.id,
        set: { name: 'Customer Triage Accuracy Benchmark' },
      });

    const eval_results: EvaluationCaseResultSchema[] = [
      {
        name: 'triage_billing',
        expected: 'billing_support',
        actual: 'billing_support',
        score: 1,
      },
      {
        name: 'triage_tech',
        expected: 'engineering_sre',
        actual: 'engineering_sre',
        score: 1,
      },
    ];

    await this.db
      .insert(evaluationRuns)
      .values({
        id: SEED_EVALUATIONS.run_id,
        organization_id: SEED_ORGS.acme_id,
        suite_id: SEED_EVALUATIONS.suite_id,
        status: 'completed',
        results: eval_results,
        passed: 2,
        total: 2,
      })
      .onConflictDoNothing({ target: evaluationRuns.id });
  }
}
