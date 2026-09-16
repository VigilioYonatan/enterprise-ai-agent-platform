import 'reflect-metadata';
import { createHash } from 'node:crypto';
import {
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { nextNode } from '@/runs/domain/services/run-state.service';
import { runAllowedTool } from '@/tools/domain/policies/tool-registry.policy';
import type { AgentVersionSchema } from './modules/agents/domain/schemas/agent.schema';
import type { ApprovalSchema } from './modules/approvals/domain/schemas/approval.schema';
import { KnowledgeService } from './modules/knowledge/application/service/knowledge.service';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { RUN_CONSTANTS } from './modules/runs/constants/runs.constants';
import type { RunSchema } from './modules/runs/domain/schemas/run.schema';
import {
  CONNECTOR_PROFILE,
  ConnectorProfilePort,
} from './modules/tools/application/ports/connector-profile.port';
import { ToolsModule } from './modules/tools/tools.module';
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowVersionSchema,
} from './modules/workflows/domain/schemas/workflow.schema';
import { graphSchema } from './modules/workflows/domain/schemas/workflow.schema';
import { AppConfigModule } from './shared/config/app-config.module';
import { DatabaseModule } from './shared/database/database.module';

const MAX_RUN_STEPS = RUN_CONSTANTS.MAX_RUN_STEPS;

type RunExecutionClaim = Pick<
  RunSchema,
  | 'id'
  | 'organization_id'
  | 'created_by'
  | 'input'
  | 'context'
  | 'next_node_id'
  | 'workflow_version_id'
  | 'retry_count'
  | 'step_count'
> & {
  lease_token: NonNullable<RunSchema['lease_token']>;
};

type ApprovalVerificationRecord = Pick<
  ApprovalSchema,
  'status' | 'payload_hash' | 'expires_at'
>;

@Injectable()
class DurableWorker implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly knowledge: KnowledgeService,
    @Inject(CONNECTOR_PROFILE)
    private readonly connectorProfile: ConnectorProfilePort,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 1100);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.expireApprovals();
      const { rows } = await this.pool.query<RunExecutionClaim>(
        `WITH picked AS (
          SELECT id FROM runs
          WHERE (status='queued' AND (next_retry_at IS NULL OR next_retry_at<=now()))
             OR (status='running' AND lease_until<now())
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED LIMIT 1)
         UPDATE runs
         SET status='running',lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid(),updated_at=now()
         FROM picked WHERE runs.id=picked.id RETURNING runs.*`,
      );
      if (rows[0]) await this.process(rows[0]);
    } catch (error) {
      console.error(
        'Worker tick error:',
        error instanceof Error ? error.message : 'unknown',
      );
    } finally {
      this.busy = false;
    }
  }

  private async expireApprovals() {
    const { rows } = await this.pool.query<Pick<ApprovalSchema, 'run_id'>>(
      `UPDATE approval_requests SET status='expired',decided_at=now()
       WHERE status='pending' AND expires_at<=now() RETURNING run_id`,
    );
    for (const row of rows) {
      const changed = await this.pool.query(
        `UPDATE runs SET status='cancelled',error='Approval expired',lease_until=NULL,lease_token=NULL,updated_at=now()
         WHERE id=$1 AND status='waiting_approval' RETURNING id`,
        [row.run_id],
      );
      if (changed.rowCount) {
        await this.pool.query(
          `INSERT INTO run_events(run_id,event_type,data) VALUES($1,'approval.expired','{}'::jsonb)`,
          [row.run_id],
        );
      }
    }
  }

  private async process(claim: RunExecutionClaim) {
    if (claim.step_count >= MAX_RUN_STEPS) {
      await this.fail(claim, 'Maximum workflow step limit exceeded');
      return;
    }
    const { rows: versions } = await this.pool.query<
      Pick<WorkflowVersionSchema, 'graph'>
    >('SELECT graph FROM workflow_versions WHERE id=$1', [
      claim.workflow_version_id,
    ]);
    const parsed = graphSchema.safeParse(versions[0]?.graph);
    if (!parsed.success) {
      await this.fail(claim, 'Workflow version schema is invalid');
      return;
    }
    const graph: WorkflowGraph = parsed.data;
    const node = graph.nodes.find(
      (candidateNode) => candidateNode.id === claim.next_node_id,
    );
    if (!node) {
      await this.fail(claim, 'Next workflow node not found');
      return;
    }
    try {
      const active = await this.pool.query(
        `SELECT 1 FROM runs WHERE id=$1 AND status='running' AND lease_token=$2 AND lease_until>now()`,
        [claim.id, claim.lease_token],
      );
      if (!active.rowCount) return; // Cancelled or reclaimed while worker was preparing this step.
      let output: unknown = claim.context.output ?? claim.input;
      let condition: boolean | undefined;
      if (node.type === 'agent') output = await this.invokeAgent(claim, node);
      if (node.type === 'condition') {
        const field = node.config?.field;
        if (typeof field !== 'string') throw Error('Invalid condition config');
        const upstream =
          typeof claim.context.output === 'object' &&
          claim.context.output !== null
            ? (claim.context.output as Record<string, unknown>)[field]
            : undefined;
        const candidate =
          upstream !== undefined ? upstream : claim.input[field];
        condition =
          JSON.stringify(candidate) === JSON.stringify(node.config?.equals);
        output = { condition };
      }
      if (node.type === 'tool' || node.type === 'approval') {
        const tool_key =
          node.type === 'approval'
            ? 'approval.checkpoint'
            : String(node.config?.tool_key);
        const payload = {
          value:
            typeof output === 'string'
              ? output
              : String(claim.input.text ?? ''),
          input: claim.input,
          config: node.config ?? {},
        };
        const payload_hash = createHash('sha256')
          .update(JSON.stringify({ tool_key, payload }))
          .digest('hex');
        const { rows } = await this.pool.query<ApprovalVerificationRecord>(
          `SELECT status,payload_hash,expires_at FROM approval_requests WHERE run_id=$1 AND node_id=$2`,
          [claim.id, node.id],
        );
        if (
          node.type === 'approval' ||
          node.config?.requires_approval === true ||
          tool_key === 'connector.profile.read'
        ) {
          if (!rows.length) {
            await this.waitForApproval(
              claim,
              node,
              tool_key,
              payload,
              payload_hash,
            );
            return;
          }
          if (rows[0].status === 'rejected' || rows[0].status === 'expired') {
            throw Error('Tool approval was rejected or expired');
          }
          if (rows[0].status !== 'approved') {
            await this.releaseWaiting(claim);
            return;
          }
          if (rows[0].payload_hash !== payload_hash)
            throw Error('Approved payload hash mismatch');
        }
        if (node.type === 'tool') {
          // Do not execute a tool when approval was revoked or another worker owns the run.
          const current = await this.pool.query(
            `SELECT 1 FROM runs WHERE id=$1 AND status='running' AND lease_token=$2 AND lease_until>now()`,
            [claim.id, claim.lease_token],
          );
          if (!current.rowCount) return;
          if (tool_key === 'knowledge.search') {
            const knowledge_base_id = node.config?.knowledge_base_id;
            if (typeof knowledge_base_id !== 'string')
              throw Error('Knowledge search requires knowledge_base_id');
            const query = String(payload.value ?? '').slice(0, 200);
            if (query.trim().length < 2)
              throw Error('Knowledge search requires a query');
            output = await this.knowledge.search(
              { sub: claim.created_by, email: '', email_verified: true },
              {
                organization_id: claim.organization_id,
                knowledge_base_id,
                query,
              },
            );
          } else if (tool_key === 'connector.profile.read') {
            const connection_id = node.config?.connection_id;
            if (typeof connection_id !== 'string')
              throw Error('OAuth tool requires connection_id');
            output = await this.connectorProfile.read(
              { sub: claim.created_by, email: '', email_verified: true },
              claim.organization_id,
              connection_id,
            );
          } else {
            output = runAllowedTool(tool_key, payload, node.config ?? {});
          }
        }
      }
      const next_node_id = nextNode(graph.edges, node.id, condition);
      if (!next_node_id && node.type !== 'output')
        throw Error(`Non-output node ${node.id} has no next edge`);
      await this.completeStep(claim, node.id, output, next_node_id);
    } catch (error) {
      await this.fail(
        claim,
        error instanceof Error ? error.message : 'Unknown step failure',
      );
    }
  }

  private async invokeAgent(claim: RunExecutionClaim, node: WorkflowNode) {
    const agent_id = node.config?.agent_id;
    if (typeof agent_id !== 'string') throw Error('Agent node needs agent_id');
    const version_id = node.config?.agent_version_id;
    const { rows } =
      version_id && typeof version_id === 'string'
        ? await this.pool.query<Pick<AgentVersionSchema, 'instructions'>>(
            `SELECT v.instructions FROM agent_versions v JOIN agents a ON a.id=v.agent_id
             WHERE v.id=$1 AND v.agent_id=$2 AND a.organization_id=$3`,
            [version_id, agent_id, claim.organization_id],
          )
        : await this.pool.query<Pick<AgentVersionSchema, 'instructions'>>(
            `SELECT v.instructions FROM agent_versions v JOIN agents a ON a.id=v.agent_id
             WHERE a.id=$1 AND a.organization_id=$2 ORDER BY v.version DESC LIMIT 1`,
            [agent_id, claim.organization_id],
          );
    if (!rows[0]) throw Error('Pinned agent version not found in organization');
    const url = process.env.OLLAMA_URL;
    if (!url) throw Error('Local model runtime is unavailable');
    const model = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';
    const signal = AbortSignal.timeout(30_000);
    const promptInput = claim.context.output ?? claim.input;
    const userPrompt =
      typeof promptInput === 'string'
        ? promptInput
        : JSON.stringify(promptInput);
    const response = await fetch(new URL('/api/chat', url), {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        options: { num_predict: 512 },
        messages: [
          {
            role: 'system',
            content: rows[0].instructions || 'Answer accurately.',
          },
          { role: 'user', content: userPrompt.slice(0, 12000) },
        ],
      }),
    });
    if (!response.ok)
      throw Error(`Local model unavailable (${response.status})`);
    const data = (await response.json()) as {
      message?: { content?: string };
      eval_count?: number;
      prompt_eval_count?: number;
    };
    if (typeof data.message?.content !== 'string')
      throw Error('Invalid model response');
    await this.pool.query(
      `INSERT INTO usage_records(organization_id,run_id,node_id,provider,model,input_tokens,output_tokens)
       VALUES($1,$2,$3,'ollama',$4,$5,$6) ON CONFLICT DO NOTHING`,
      [
        claim.organization_id,
        claim.id,
        node.id,
        model,
        data.prompt_eval_count ?? 0,
        data.eval_count ?? 0,
      ],
    );
    return data.message.content;
  }

  private async waitForApproval(
    claim: RunExecutionClaim,
    node: WorkflowNode,
    tool_key: string,
    payload: unknown,
    payload_hash: string,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const state = await client.query(
        `UPDATE runs SET status='waiting_approval',lease_until=NULL,lease_token=NULL,updated_at=now()
         WHERE id=$1 AND status='running' AND lease_token=$2 AND lease_until>now() RETURNING id`,
        [claim.id, claim.lease_token],
      );
      if (!state.rowCount) {
        await client.query('ROLLBACK');
        return;
      }
      const inserted = await client.query<Pick<ApprovalSchema, 'id'>>(
        `INSERT INTO approval_requests(organization_id,run_id,node_id,tool_key,payload,payload_hash,requested_by,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '24 hours')
         ON CONFLICT(run_id,node_id) DO NOTHING RETURNING id`,
        [
          claim.organization_id,
          claim.id,
          node.id,
          tool_key,
          JSON.stringify(payload),
          payload_hash,
          claim.created_by,
        ],
      );
      let approval_id = inserted.rows[0]?.id ?? null;
      if (!approval_id) {
        const existing = await client.query<Pick<ApprovalSchema, 'id'>>(
          `SELECT id FROM approval_requests WHERE run_id=$1 AND node_id=$2 LIMIT 1`,
          [claim.id, node.id],
        );
        approval_id = existing.rows[0]?.id ?? null;
      }
      await client.query(
        `INSERT INTO run_events(run_id,event_type,data) VALUES($1,'approval.requested',$2::jsonb)`,
        [claim.id, JSON.stringify({ node_id: node.id, tool_key, approval_id })],
      );
      await client.query(
        `INSERT INTO notifications(organization_id,recipient_id,kind,source_event,payload)
         SELECT m.organization_id,m.user_id,'approval.requested',$1,$2::jsonb FROM memberships m
         WHERE m.organization_id=$3 AND m.role IN ('owner','admin') AND m.user_id<>$4
         ON CONFLICT(organization_id,recipient_id,source_event) DO NOTHING`,
        [
          `approval:${claim.id}:${node.id}`,
          JSON.stringify({ run_id: claim.id, node_id: node.id, approval_id }),
          claim.organization_id,
          claim.created_by,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async releaseWaiting(claim: RunExecutionClaim) {
    await this.pool.query(
      `UPDATE runs SET status='waiting_approval',lease_until=NULL WHERE id=$1 AND status='running' AND lease_token=$2`,
      [claim.id, claim.lease_token],
    );
  }

  private async completeStep(
    claim: RunExecutionClaim,
    node_id: string,
    output: unknown,
    next_node_id: string | null,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const nextContext = { ...claim.context, [node_id]: output, output };
      const state = await client.query(
        `UPDATE runs SET status=$2,next_node_id=$3,context=$4::jsonb,result=$5::jsonb,
         retry_count=0,next_retry_at=NULL,lease_until=NULL,lease_token=NULL,step_count=step_count+1,updated_at=now()
         WHERE id=$1 AND status='running' AND lease_token=$6 RETURNING id`,
        [
          claim.id,
          next_node_id ? 'queued' : 'completed',
          next_node_id,
          JSON.stringify(nextContext),
          next_node_id ? null : JSON.stringify(output),
          claim.lease_token,
        ],
      );
      if (!state.rowCount) {
        await client.query('ROLLBACK');
        return;
      }
      await client.query(
        `INSERT INTO run_steps(run_id,node_id,attempt,status,output) VALUES($1,$2,$3,'completed',$4::jsonb)
         ON CONFLICT(run_id,node_id,attempt) DO NOTHING`,
        [
          claim.id,
          node_id,
          claim.retry_count + 1,
          JSON.stringify(output ?? null),
        ],
      );
      const event_type = next_node_id ? 'run.step_completed' : 'run.completed';
      await client.query(
        `INSERT INTO run_events(run_id,event_type,data) VALUES($1,$2,$3::jsonb)`,
        [
          claim.id,
          event_type,
          JSON.stringify({
            node_id,
            status: next_node_id ? 'queued' : 'completed',
          }),
        ],
      );
      await client.query(
        `INSERT INTO outbox_events(subject,payload) VALUES($1,$2::jsonb)`,
        [
          event_type,
          JSON.stringify({
            run_id: claim.id,
            organization_id: claim.organization_id,
            node_id,
          }),
        ],
      );
      if (!next_node_id) {
        await client.query(
          `INSERT INTO notifications(organization_id,recipient_id,kind,source_event,payload)
           VALUES($1,$2,'run.completed',$3,$4::jsonb) ON CONFLICT DO NOTHING`,
          [
            claim.organization_id,
            claim.created_by,
            `run.completed:${claim.id}`,
            JSON.stringify({ run_id: claim.id }),
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async fail(claim: RunExecutionClaim, reason: string) {
    const retryable =
      claim.retry_count < 2 &&
      /timed out|unavailable|fetch failed|disconnected/i.test(reason);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const state = await client.query(
        `UPDATE runs SET status=$2,lease_until=NULL,lease_token=NULL,
         retry_count=retry_count+1,next_retry_at=CASE WHEN $3::boolean THEN now()+make_interval(secs=>power(2,retry_count+1)::int) ELSE NULL END,
         error=$4,updated_at=now() WHERE id=$1 AND status='running' AND lease_token=$5 RETURNING id`,
        [
          claim.id,
          retryable ? 'queued' : 'failed',
          retryable,
          reason.slice(0, 450),
          claim.lease_token,
        ],
      );
      if (state.rowCount) {
        await client.query(
          `INSERT INTO run_steps(run_id,node_id,attempt,status,error) VALUES($1,$2,$3,'failed',$4)
           ON CONFLICT(run_id,node_id,attempt) DO NOTHING`,
          [
            claim.id,
            claim.next_node_id,
            claim.retry_count + 1,
            reason.slice(0, 450),
          ],
        );
        await client.query(
          `INSERT INTO run_events(run_id,event_type,data) VALUES($1,$2,$3::jsonb)`,
          [
            claim.id,
            retryable ? 'run.retry_scheduled' : 'run.failed',
            JSON.stringify({
              error: reason.slice(0, 160),
              attempt: claim.retry_count + 1,
            }),
          ],
        );
        if (!retryable) {
          await client.query(
            `INSERT INTO notifications(organization_id,recipient_id,kind,source_event,payload)
             VALUES($1,$2,'run.failed',$3,$4::jsonb) ON CONFLICT DO NOTHING`,
            [
              claim.organization_id,
              claim.created_by,
              `run.failed:${claim.id}`,
              JSON.stringify({ run_id: claim.id }),
            ],
          );
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

@Module({
  imports: [AppConfigModule, DatabaseModule, KnowledgeModule, ToolsModule],
  providers: [DurableWorker],
})
class WorkerModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();
}

main().catch((error) => {
  console.error(
    'Worker bootstrap error:',
    error instanceof Error ? error.message : 'unknown',
  );
  process.exitCode = 1;
});
