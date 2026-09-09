import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../../../../database/schema';
import { auditEvents, memberships } from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { UserSchema } from '../../../../identity/domain/schemas/user.schema';
import type { OrganizationSchema } from '../../../../organizations/domain/schemas/organization.schema';
import type { KnowledgeRepositoryPort } from '../../../application/ports/knowledge-repository.port';
import type {
  KnowledgeBaseCreatedSummary,
  KnowledgeBaseSummary,
  KnowledgeDocumentCreatedSummary,
  KnowledgeDocumentDetail,
  KnowledgeDocumentInput,
  KnowledgeDocumentReindexedSummary,
  KnowledgeDocumentSummary,
  KnowledgeSearchChunkResult,
  KnowledgeSearchInput,
} from '../../../application/types/knowledge.type';
import { KNOWLEDGE_CONSTANTS } from '../../../constants/knowledge.constants';
import type {
  KnowledgeBaseSchema,
  KnowledgeDocumentSchema,
} from '../../../domain/schemas/knowledge.schema';
import {
  knowledgeBases,
  knowledgeDocumentAcl,
  knowledgeDocuments,
} from './knowledge.table';

/** Drizzle ORM implementation of the knowledge persistence port. */
@Injectable()
export class DrizzleKnowledgeRepository implements KnowledgeRepositoryPort {
  private readonly db: AppDatabase;

  constructor(@Inject(DB) db_or_pool: AppDatabase | Pool) {
    this.db =
      'connect' in db_or_pool &&
      typeof (db_or_pool as Pool).connect === 'function'
        ? (drizzle(db_or_pool as Pool, { schema }) as AppDatabase)
        : (db_or_pool as AppDatabase);
  }

  async listBases(
    organization_id: OrganizationSchema['id'],
  ): Promise<KnowledgeBaseSummary[]> {
    return this.db
      .select({
        id: knowledgeBases.id,
        name: knowledgeBases.name,
        created_at: knowledgeBases.created_at,
      })
      .from(knowledgeBases)
      .where(eq(knowledgeBases.organization_id, organization_id))
      .orderBy(desc(knowledgeBases.created_at));
  }

  async createBase(
    actor_id: UserSchema['id'],
    organization_id: OrganizationSchema['id'],
    name: KnowledgeBaseSchema['name'],
  ): Promise<KnowledgeBaseCreatedSummary> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(knowledgeBases)
        .values({
          organization_id,
          name,
        })
        .returning({
          id: knowledgeBases.id,
          name: knowledgeBases.name,
        });

      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'knowledge_base.created',
        resource_id: row.id,
        metadata: {},
      });

      return row;
    });
  }

  async documents(
    actor_id: UserSchema['id'],
    organization_id: OrganizationSchema['id'],
  ): Promise<KnowledgeDocumentSummary[]> {
    const rows = await this.db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        knowledge_base_id: knowledgeDocuments.knowledge_base_id,
        status: knowledgeDocuments.status,
        index_model: knowledgeDocuments.index_model,
        index_error: knowledgeDocuments.index_error,
        indexed_at: knowledgeDocuments.indexed_at,
        created_at: knowledgeDocuments.created_at,
      })
      .from(knowledgeDocuments)
      .innerJoin(
        knowledgeDocumentAcl,
        and(
          eq(knowledgeDocumentAcl.document_id, knowledgeDocuments.id),
          eq(
            knowledgeDocumentAcl.organization_id,
            knowledgeDocuments.organization_id,
          ),
        ),
      )
      .where(
        and(
          eq(knowledgeDocuments.organization_id, organization_id),
          eq(knowledgeDocumentAcl.user_id, actor_id),
          eq(knowledgeDocumentAcl.can_read, true),
        ),
      )
      .orderBy(desc(knowledgeDocuments.created_at))
      .limit(KNOWLEDGE_CONSTANTS.DOCUMENTS_LIST_LIMIT);

    return rows;
  }

  async getDocument(
    actor_id: UserSchema['id'],
    organization_id: OrganizationSchema['id'],
    document_id: KnowledgeDocumentSchema['id'],
  ): Promise<KnowledgeDocumentDetail | null> {
    const rows = await this.db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        content: knowledgeDocuments.content,
        knowledge_base_id: knowledgeDocuments.knowledge_base_id,
        created_by: knowledgeDocuments.created_by,
        status: knowledgeDocuments.status,
        source_version: knowledgeDocuments.source_version,
        index_model: knowledgeDocuments.index_model,
        index_error: knowledgeDocuments.index_error,
        indexed_at: knowledgeDocuments.indexed_at,
        created_at: knowledgeDocuments.created_at,
      })
      .from(knowledgeDocuments)
      .innerJoin(
        knowledgeDocumentAcl,
        and(
          eq(knowledgeDocumentAcl.document_id, knowledgeDocuments.id),
          eq(
            knowledgeDocumentAcl.organization_id,
            knowledgeDocuments.organization_id,
          ),
        ),
      )
      .where(
        and(
          eq(knowledgeDocuments.id, document_id),
          eq(knowledgeDocuments.organization_id, organization_id),
          eq(knowledgeDocumentAcl.user_id, actor_id),
          eq(knowledgeDocumentAcl.can_read, true),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async createDocument(
    actor_id: UserSchema['id'],
    document_input: KnowledgeDocumentInput,
  ): Promise<KnowledgeDocumentCreatedSummary> {
    return this.db.transaction(async (tx) => {
      const knowledge_base = await tx
        .select({ id: knowledgeBases.id })
        .from(knowledgeBases)
        .where(
          and(
            eq(knowledgeBases.id, document_input.knowledge_base_id),
            eq(knowledgeBases.organization_id, document_input.organization_id),
          ),
        )
        .limit(1);

      if (!knowledge_base.length) {
        throw new NotFoundException('Knowledge base not found');
      }

      const [created_document] = await tx
        .insert(knowledgeDocuments)
        .values({
          organization_id: document_input.organization_id,
          knowledge_base_id: document_input.knowledge_base_id,
          title: document_input.title,
          content: document_input.content,
          created_by: actor_id,
          status: 'pending',
        })
        .returning({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          status: knowledgeDocuments.status,
        });

      await tx.insert(knowledgeDocumentAcl).values({
        document_id: created_document.id,
        organization_id: document_input.organization_id,
        user_id: actor_id,
        can_read: true,
        granted_by: actor_id,
      });

      await tx.insert(auditEvents).values({
        organization_id: document_input.organization_id,
        actor_id,
        action: 'document.created',
        resource_id: created_document.id,
        metadata: { knowledge_base_id: document_input.knowledge_base_id },
      });

      return created_document;
    });
  }

  async grantRead(
    actor_id: UserSchema['id'],
    organization_id: OrganizationSchema['id'],
    document_id: KnowledgeDocumentSchema['id'],
    user_id: UserSchema['id'],
  ): Promise<{ granted: boolean }> {
    return this.db.transaction(async (tx) => {
      const source = await tx
        .select({ id: knowledgeDocuments.id })
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.id, document_id),
            eq(knowledgeDocuments.organization_id, organization_id),
          ),
        )
        .for('update');

      if (!source.length) {
        throw new NotFoundException('Document not found');
      }

      const member = await tx
        .select({ organization_id: memberships.organization_id })
        .from(memberships)
        .where(
          and(
            eq(memberships.organization_id, organization_id),
            eq(memberships.user_id, user_id),
          ),
        )
        .limit(1);

      if (!member.length) {
        throw new ForbiddenException(
          'Target user is not a member of this organization',
        );
      }

      await tx
        .insert(knowledgeDocumentAcl)
        .values({
          document_id,
          organization_id,
          user_id,
          can_read: true,
          granted_by: actor_id,
        })
        .onConflictDoUpdate({
          target: [
            knowledgeDocumentAcl.document_id,
            knowledgeDocumentAcl.user_id,
          ],
          set: {
            can_read: true,
            granted_by: actor_id,
            granted_at: sql`now()`,
          },
        });

      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'document.acl_granted',
        resource_id: document_id,
        metadata: { target_user: user_id },
      });

      return { granted: true };
    });
  }

  async revokeRead(
    actor_id: UserSchema['id'],
    organization_id: OrganizationSchema['id'],
    document_id: KnowledgeDocumentSchema['id'],
    user_id: UserSchema['id'],
  ): Promise<{ revoked: boolean }> {
    return this.db.transaction(async (tx) => {
      const document_rows = await tx
        .select({ created_by: knowledgeDocuments.created_by })
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.id, document_id),
            eq(knowledgeDocuments.organization_id, organization_id),
          ),
        )
        .for('update');

      if (!document_rows.length) {
        throw new NotFoundException('Document not found');
      }

      if (document_rows[0].created_by === user_id) {
        throw new ConflictException('Cannot revoke document owner');
      }

      await tx
        .delete(knowledgeDocumentAcl)
        .where(
          and(
            eq(knowledgeDocumentAcl.organization_id, organization_id),
            eq(knowledgeDocumentAcl.document_id, document_id),
            eq(knowledgeDocumentAcl.user_id, user_id),
          ),
        );

      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'document.acl_revoked',
        resource_id: document_id,
        metadata: { target_user: user_id },
      });

      return { revoked: true };
    });
  }

  async reindex(
    organization_id: OrganizationSchema['id'],
    document_id: KnowledgeDocumentSchema['id'],
  ): Promise<KnowledgeDocumentReindexedSummary> {
    const rows = await this.db
      .update(knowledgeDocuments)
      .set({
        status: 'pending',
        lease_until: null,
        attempts: 0,
        index_error: null,
        source_version: sql`${knowledgeDocuments.source_version} + 1`,
      })
      .where(
        and(
          eq(knowledgeDocuments.id, document_id),
          eq(knowledgeDocuments.organization_id, organization_id),
          inArray(knowledgeDocuments.status, ['ready', 'failed']),
        ),
      )
      .returning({
        id: knowledgeDocuments.id,
        status: knowledgeDocuments.status,
      });

    if (!rows.length) {
      throw new ConflictException('Document not reindexable or not found');
    }

    return rows[0];
  }

  async searchAuthorized(
    actor_id: UserSchema['id'],
    search_input: KnowledgeSearchInput,
    vector: number[],
    model: string,
  ): Promise<KnowledgeSearchChunkResult[]> {
    const knowledge_base = await this.db
      .select({ id: knowledgeBases.id })
      .from(knowledgeBases)
      .where(
        and(
          eq(knowledgeBases.id, search_input.knowledge_base_id),
          eq(knowledgeBases.organization_id, search_input.organization_id),
        ),
      )
      .limit(1);

    if (!knowledge_base.length) {
      throw new NotFoundException('Knowledge base not found');
    }

    const vector_literal = `[${vector.join(',')}]`;
    const result = await this.db.execute<KnowledgeSearchChunkResult>(sql`
      WITH permitted AS MATERIALIZED (
        SELECT c.id, c.document_id, c.content, c.embedding, d.title, d.source_version
        FROM knowledge_chunks c
        JOIN knowledge_documents d ON d.id=c.document_id AND d.organization_id=c.organization_id AND d.source_version=c.source_version
        JOIN knowledge_document_acl a ON a.document_id=d.id AND a.organization_id=d.organization_id AND a.user_id=${actor_id} AND a.can_read
        WHERE c.organization_id=${search_input.organization_id} AND d.knowledge_base_id=${search_input.knowledge_base_id} AND d.status='ready' AND d.index_model=${model}
      ), dense AS (
        SELECT id, row_number() OVER(ORDER BY distance, id) AS rank_dense FROM (
          SELECT id, embedding <=> ${vector_literal}::vector AS distance FROM permitted WHERE embedding IS NOT NULL
          ORDER BY distance, id LIMIT 40
        ) d
      ), lexical AS (
        SELECT id, row_number() OVER(ORDER BY rank_score DESC, id) AS rank_lexical FROM (
          SELECT id, ts_rank_cd(to_tsvector('simple', content), websearch_to_tsquery('simple', ${search_input.query})) AS rank_score FROM permitted
          WHERE to_tsvector('simple', content) @@ websearch_to_tsquery('simple', ${search_input.query})
          ORDER BY rank_score DESC, id LIMIT 40
        ) l
      ), fused AS (
        SELECT coalesce(dense.id, lexical.id) AS id,
        coalesce(1.0 / (60 + dense.rank_dense), 0.0) + coalesce(1.0 / (60 + lexical.rank_lexical), 0.0) AS score
        FROM dense FULL JOIN lexical ON lexical.id = dense.id
      )
      SELECT p.id, p.document_id, p.title, p.content AS excerpt, p.source_version, f.score::double precision AS score
      FROM fused f
      JOIN permitted p ON p.id = f.id
      ORDER BY f.score DESC, p.id LIMIT 20
    `);

    return (result.rows ?? result) as KnowledgeSearchChunkResult[];
  }
}
