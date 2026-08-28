import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  agents,
  agentVersions,
  auditEvents,
  outboxEvents,
} from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { AgentRepository } from '../../../application/repositories/agent.repository.interface';
import type {
  AgentSchema,
  AgentVersionSchema,
} from '../../../domain/schemas/agent.schema';

/** Drizzle adapter. Only this layer is aware of table shapes or transactional SQL. */
@Injectable()
export class DrizzleAgentRepository implements AgentRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async list(organization_id: string): Promise<AgentSchema[]> {
    return this.db
      .select()
      .from(agents)
      .where(eq(agents.organization_id, organization_id))
      .orderBy(desc(agents.created_at));
  }

  async create(
    input: { organization_id: string; name: string; instructions: string },
    actor_id: string,
  ): Promise<AgentSchema> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(agents).values(input).returning();
      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id,
        action: 'agent.created',
        resource_id: row.id,
        metadata: {},
      });
      return row;
    });
  }

  async get(organization_id: string, id: string): Promise<AgentSchema | null> {
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(
        and(eq(agents.id, id), eq(agents.organization_id, organization_id)),
      )
      .limit(1);
    return agent ?? null;
  }

  async update(
    organization_id: string,
    id: string,
    revision: number,
    changes: { name?: string; instructions?: string },
  ): Promise<AgentSchema | null> {
    const [row] = await this.db
      .update(agents)
      .set({
        ...changes,
        revision: sql`${agents.revision}+1`,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(agents.id, id),
          eq(agents.organization_id, organization_id),
          eq(agents.revision, revision),
          sql`${agents.status} in ('draft','published')`,
        ),
      )
      .returning();
    return row ?? null;
  }

  async publish(
    organization_id: string,
    id: string,
    revision: number,
    actor_id: string,
  ): Promise<(AgentSchema & { published_version: number }) | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(agents)
        .set({
          status: 'published',
          revision: sql`${agents.revision}+1`,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(agents.id, id),
            eq(agents.organization_id, organization_id),
            eq(agents.revision, revision),
            sql`${agents.status} in ('draft','published')`,
          ),
        )
        .returning();
      if (!row?.instructions.trim()) return null;
      const [counter] = await tx
        .select({
          next_version: sql<number>`cast(coalesce(max(${agentVersions.version}),0)+1 as integer)`,
        })
        .from(agentVersions)
        .where(eq(agentVersions.agent_id, id));
      const next_version = counter?.next_version ?? 1;
      const [version] = await tx
        .insert(agentVersions)
        .values({
          agent_id: id,
          version: next_version,
          instructions: row.instructions,
        })
        .returning();
      await tx.insert(outboxEvents).values({
        subject: 'workflow.agent_published',
        payload: { organization_id, agent_id: id, version_id: version.id },
      });
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'agent.published',
        resource_id: id,
        metadata: { version: version.version },
      });
      return { ...row, published_version: version.version };
    });
  }

  async archive(
    organization_id: string,
    id: string,
    revision: number,
    actor_id: string,
  ): Promise<AgentSchema | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(agents)
        .set({
          status: 'archived',
          revision: sql`${agents.revision}+1`,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(agents.id, id),
            eq(agents.organization_id, organization_id),
            eq(agents.revision, revision),
            sql`${agents.status} in ('draft','published')`,
          ),
        )
        .returning();
      if (!row) return null;
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'agent.archived',
        resource_id: id,
        metadata: {},
      });
      return row;
    });
  }

  async versions(
    organization_id: string,
    id: string,
  ): Promise<AgentVersionSchema[]> {
    const rows = await this.db
      .select({ version: agentVersions })
      .from(agentVersions)
      .innerJoin(agents, eq(agents.id, agentVersions.agent_id))
      .where(
        and(
          eq(agents.organization_id, organization_id),
          eq(agentVersions.agent_id, id),
        ),
      )
      .orderBy(desc(agentVersions.version));
    return rows.map((row) => row.version);
  }
}
