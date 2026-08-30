import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  auditEvents,
  outboxEvents,
  workflows,
  workflowVersions,
} from '../../../../../database/schema';
import {
  AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { WorkflowRepository } from '../../../application/repositories/workflow.repository.interface';
import type { NewWorkflowInput } from '../../../application/types/workflow.type';
import type { WorkflowGraph } from '../../../domain/schemas/workflow.schema';

@Injectable()
export class DrizzleWorkflowRepository implements WorkflowRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async list(organization_id: string, limit: number, offset: number) {
    const where = eq(workflows.organization_id, organization_id);
    const [rows, total] = await Promise.all([
      this.db
        .select()
        .from(workflows)
        .where(where)
        .orderBy(desc(workflows.created_at), desc(workflows.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(workflows)
        .where(where),
    ]);
    return { count: total[0]?.count ?? 0, results: rows };
  }

  async create(data: NewWorkflowInput) {
    const [row] = await this.db.insert(workflows).values(data).returning();
    return row;
  }

  async get(organization_id: string, id: string) {
    const [row] = await this.db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.organization_id, organization_id),
          eq(workflows.id, id),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async update(
    organization_id: string,
    id: string,
    expected_revision: number,
    changes: { name?: string; graph?: WorkflowGraph },
  ) {
    const [row] = await this.db
      .update(workflows)
      .set({
        ...changes,
        revision: sql`${workflows.revision} + 1`,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(workflows.organization_id, organization_id),
          eq(workflows.id, id),
          eq(workflows.revision, expected_revision),
          sql`${workflows.status} in ('draft','published')`,
        ),
      )
      .returning();
    return row ?? null;
  }

  async publish(
    organization_id: string,
    id: string,
    expected_revision: number,
    actor_id: string,
    snapshot: WorkflowGraph,
  ) {
    return this.db.transaction(async (tx) => {
      const [workflow] = await tx
        .update(workflows)
        .set({
          status: 'published',
          revision: sql`${workflows.revision}+1`,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organization_id, organization_id),
            sql`${workflows.status} in ('draft','published')`,
            eq(workflows.revision, expected_revision),
          ),
        )
        .returning();
      if (!workflow) return null;
      const [counter] = await tx
        .select({
          next_version: sql<number>`cast(coalesce(max(${workflowVersions.version}),0)+1 as integer)`,
        })
        .from(workflowVersions)
        .where(eq(workflowVersions.workflow_id, id));
      const next_version = counter?.next_version ?? 1;
      const [version] = await tx
        .insert(workflowVersions)
        .values({ workflow_id: id, version: next_version, graph: snapshot })
        .returning();
      await tx.insert(outboxEvents).values({
        subject: 'workflow.published',
        payload: { organization_id, workflow_id: id, version_id: version.id },
      });
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'workflow.published',
        resource_id: id,
        metadata: { version: version.version },
      });
      return { ...workflow, published_version: version.version };
    });
  }

  async archive(
    organization_id: string,
    id: string,
    expected_revision: number,
    actor_id: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [workflow] = await tx
        .update(workflows)
        .set({
          status: 'archived',
          revision: sql`${workflows.revision}+1`,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organization_id, organization_id),
            sql`${workflows.status} in ('draft','published')`,
            eq(workflows.revision, expected_revision),
          ),
        )
        .returning();
      if (!workflow) return null;
      await tx.insert(outboxEvents).values({
        subject: 'workflow.archived',
        payload: { organization_id, workflow_id: id },
      });
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'workflow.archived',
        resource_id: id,
        metadata: {},
      });
      return workflow;
    });
  }

  async versions(organization_id: string, id: string) {
    const exists = await this.get(organization_id, id);
    if (!exists) return [];
    return this.db
      .select()
      .from(workflowVersions)
      .where(eq(workflowVersions.workflow_id, id))
      .orderBy(desc(workflowVersions.version));
  }
}
