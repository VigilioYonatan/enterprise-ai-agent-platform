import { Pool } from 'pg';
import type { AgentVersionSchema } from './modules/agents/domain/schemas/agent.schema';
import {
  type EvaluationRunSchema,
  type EvaluationSuiteSchema,
  exactMatchScore,
} from './modules/evaluations/domain/schemas/evaluation.schema';
import { databaseUrl } from './shared/config/database-credentials';
import { loadEnvironment } from './shared/config/environment.schema';

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

type EvaluationClaim = Pick<
  EvaluationRunSchema,
  'id' | 'organization_id' | 'suite_id'
> & {
  agent_id: EvaluationSuiteSchema['agent_id'];
  cases: EvaluationSuiteSchema['cases'];
  instructions: AgentVersionSchema['instructions'];
  model: EvaluationSuiteSchema['model'];
  lease_token: NonNullable<EvaluationRunSchema['lease_token']>;
};

async function main() {
  const pool = new Pool({ connectionString: databaseUrl(), max: 2 });
  let running = true;
  process.on('SIGTERM', () => {
    running = false;
  });
  process.on('SIGINT', () => {
    running = false;
  });
  try {
    while (running) {
      const claimResult = await pool.query<EvaluationClaim>(
        `WITH picked AS (
           SELECT id FROM evaluation_runs
           WHERE status='queued' OR (status='running' AND lease_until < now())
           ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE evaluation_runs r
         SET status='running',lease_until=now()+interval '10 minutes',lease_token=gen_random_uuid()
         FROM picked WHERE r.id=picked.id
         RETURNING r.id,r.organization_id,r.suite_id,r.lease_token`,
      );
      const picked = claimResult.rows[0];
      if (!picked) {
        await delay(1500);
        continue;
      }
      const { rows } = await pool.query<EvaluationClaim>(
        `SELECT e.id,e.organization_id,e.suite_id,s.agent_id,s.cases,s.model,v.instructions
         FROM evaluation_runs e
         JOIN evaluation_suites s ON s.id=e.suite_id
         JOIN agents a ON a.id=s.agent_id
         JOIN agent_versions v ON v.id=s.agent_version_id AND v.agent_id=a.id
         WHERE e.id=$1 AND s.organization_id=e.organization_id AND a.organization_id=e.organization_id`,
        [picked.id],
      );
      if (!rows[0]) {
        await pool.query(
          `UPDATE evaluation_runs SET status='failed',error='Suite or agent is unavailable',finished_at=now()
           WHERE id=$1 AND lease_token=$2 AND status='running'`,
          [picked.id, picked.lease_token],
        );
        continue;
      }
      const suite = rows[0];
      const results: unknown[] = [];
      let passed = 0;
      try {
        for (const case_item of suite.cases) {
          const url = loadEnvironment().OLLAMA_URL;
          if (!url) throw Error('Ollama is not configured');
          const response = await fetch(new URL('/api/chat', url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
              model: suite.model,
              stream: false,
              options: { num_predict: 256 },
              messages: [
                { role: 'system', content: suite.instructions },
                { role: 'user', content: case_item.prompt },
              ],
            }),
          });
          if (!response.ok) throw Error('Model unavailable');
          const payload = (await response.json()) as {
            message?: { content?: string };
            prompt_eval_count?: number;
            eval_count?: number;
          };
          const answer = payload.message?.content;
          if (typeof answer !== 'string')
            throw Error('Model returned no answer');
          await pool.query(
            `INSERT INTO usage_records(organization_id,run_id,node_id,provider,model,input_tokens,output_tokens)
             VALUES($1,NULL,$2,'ollama',$3,$4,$5)`,
            [
              suite.organization_id,
              `eval:${suite.id}:${case_item.name}`.slice(0, 80),
              suite.model,
              Math.max(0, Math.trunc(payload.prompt_eval_count ?? 0)),
              Math.max(0, Math.trunc(payload.eval_count ?? 0)),
            ],
          );
          const score = exactMatchScore(case_item.expected, answer);
          passed += score;
          results.push({
            name: case_item.name,
            expected: case_item.expected,
            actual: answer,
            score,
          });
        }
        await pool.query(
          `UPDATE evaluation_runs
           SET status='completed',lease_until=NULL,results=$2::jsonb,passed=$3,total=$4,finished_at=now()
           WHERE id=$1 AND lease_token=$5 AND status='running'`,
          [
            suite.id,
            JSON.stringify(results),
            passed,
            suite.cases.length,
            picked.lease_token,
          ],
        );
      } catch (error) {
        await pool.query(
          `UPDATE evaluation_runs
           SET status='failed',lease_until=NULL,results=$2::jsonb,error=$3,finished_at=now()
           WHERE id=$1 AND lease_token=$4 AND status='running'`,
          [
            suite.id,
            JSON.stringify(results),
            error instanceof Error ? error.message.slice(0, 400) : 'unknown',
            picked.lease_token,
          ],
        );
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    'Evaluation worker fatal:',
    error instanceof Error ? error.message : 'unknown',
  );
  process.exitCode = 1;
});
