import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import { canonicalJson } from '@/runs/domain/services/canonical-json.service';
import {
  auditEvents,
  outboxEvents,
  runEvents,
  runSteps,
  runs,
  workflows,
  workflowVersions,
} from '../../../../../database/schema';
import {
  AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { RunRepository } from '../../../application/repositories/run.repository.interface';
import type { RunStartInput } from '../../../application/types/run.type';
import { RUN_CONSTANTS } from '../../../constants/runs.constants';

@Injectable()
export class DrizzleRunRepository implements RunRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async start(input: RunStartInput) {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.organization_id, input.organization_id),
            eq(runs.created_by, input.created_by),
            eq(runs.idempotency_key, input.idempotency_key),
          ),
        )
        .limit(1);
      if (existing.length) {
        if (
          existing[0].workflow_id !== input.workflow_id ||
          canonicalJson(existing[0].input) !== canonicalJson(input.input)
        ) {
          throw new ConflictException(
            'Idempotency key already used for different request',
          );
        }
        return existing[0];
      }
      const [workflow] = await tx
        .select()
        .from(workflows)
        .where(
          and(
            eq(workflows.id, input.workflow_id),
            eq(workflows.organization_id, input.organization_id),
            eq(workflows.status, 'published'),
          ),
        )
        .limit(1);
      if (!workflow)
        throw new NotFoundException('Published workflow not found');
      const [version] = await tx
        .select()
        .from(workflowVersions)
        .where(eq(workflowVersions.workflow_id, workflow.id))
        .orderBy(desc(workflowVersions.version))
        .limit(1);
      if (!version)
        throw new ConflictException('Workflow has no published version');
      const [row] = await tx
        .insert(runs)
        .values({
          ...input,
          workflow_version_id: version.id,
          next_node_id:
            version.graph.nodes.find((n) => n.type === 'start')?.id ?? null,
          context: {},
          status: 'queued',
        })
        .onConflictDoNothing()
        .returning();
      if (!row) {
        const [collision] = await tx
          .select()
          .from(runs)
          .where(
            and(
              eq(runs.organization_id, input.organization_id),
              eq(runs.created_by, input.created_by),
              eq(runs.idempotency_key, input.idempotency_key),
            ),
          )
          .limit(1);
        if (
          !collision ||
          collision.workflow_id !== input.workflow_id ||
          canonicalJson(collision.input) !== canonicalJson(input.input)
        ) {
          throw new ConflictException('Idempotency conflict');
        }
        return collision;
      }
      await tx.insert(outboxEvents).values({
        subject: 'run.queued',
        payload: { run_id: row.id, organization_id: input.organization_id },
      });
      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id: input.created_by,
        action: 'run.started',
        resource_id: row.id,
        metadata: { workflow_id: input.workflow_id },
      });
      await tx.insert(runEvents).values({
        run_id: row.id,
        event_type: 'run.queued',
        data: { status: 'queued' },
      });
      return row;
    });
  }

  async list(organization_id: string, limit: number, offset: number) {
    const condition = eq(runs.organization_id, organization_id);
    const [results, total] = await Promise.all([
      this.db
        .select()
        .from(runs)
        .where(condition)
        .orderBy(desc(runs.created_at), desc(runs.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(runs)
        .where(condition),
    ]);
    return { results, count: total[0]?.count ?? 0 };
  }

  async get(organization_id: string, id: string) {
    return (
      (
        await this.db
          .select()
          .from(runs)
          .where(
            and(eq(runs.organization_id, organization_id), eq(runs.id, id)),
          )
          .limit(1)
      )[0] ?? null
    );
  }

  async steps(id: string) {
    return this.db
      .select()
      .from(runSteps)
      .where(eq(runSteps.run_id, id))
      .orderBy(asc(runSteps.created_at), asc(runSteps.id));
  }

  async events(id: string, after_id: number) {
    return this.db
      .select()
      .from(runEvents)
      .where(and(eq(runEvents.run_id, id), gt(runEvents.id, after_id)))
      .orderBy(asc(runEvents.id))
      .limit(RUN_CONSTANTS.EVENTS_BATCH_LIMIT);
  }

  async cancel(organization_id: string, id: string, actor_id: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(runs)
        .set({
          status: 'cancelled',
          lease_until: null,
          lease_token: null,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(runs.organization_id, organization_id),
            eq(runs.id, id),
            sql`${runs.status} in ('queued','running','waiting_approval')`,
          ),
        )
        .returning();
      if (!row) return null;
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'run.cancelled',
        resource_id: id,
        metadata: {},
      });
      await tx.insert(runEvents).values({
        run_id: id,
        event_type: 'run.cancelled',
        data: { status: 'cancelled' },
      });
      return row;
    });
  }

  async resume(organization_id: string, id: string, actor_id: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(runs)
        .where(and(eq(runs.organization_id, organization_id), eq(runs.id, id)))
        .limit(1);
      if (!current || !['failed', 'cancelled'].includes(current.status))
        return null;
      let next_node_id = current.next_node_id;
      if (!next_node_id) {
        const [version] = await tx
          .select()
          .from(workflowVersions)
          .where(eq(workflowVersions.id, current.workflow_version_id))
          .limit(1);
        next_node_id =
          version?.graph.nodes.find((n) => n.type === 'start')?.id ?? null;
      }
      if (!next_node_id) return null;
      const [row] = await tx
        .update(runs)
        .set({
          status: 'queued',
          next_node_id,
          error: null,
          retry_count: 0,
          next_retry_at: null,
          lease_until: null,
          lease_token: null,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(runs.organization_id, organization_id),
            eq(runs.id, id),
            sql`${runs.status} in ('failed','cancelled')`,
          ),
        )
        .returning();
      if (!row) return null;
      await tx.insert(outboxEvents).values({
        subject: 'run.queued',
        payload: { run_id: row.id, organization_id },
      });
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'run.resumed',
        resource_id: id,
        metadata: { next_node_id },
      });
      await tx.insert(runEvents).values({
        run_id: id,
        event_type: 'run.resumed',
        data: { status: 'queued', next_node_id },
      });
      return row;
    });
  }
}
