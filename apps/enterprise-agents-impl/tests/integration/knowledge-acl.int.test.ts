import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { KnowledgeService } from '../../src/modules/knowledge/application/service/knowledge.service';
import { PostgresKnowledgeRepository } from '../../src/modules/knowledge/infrastructure/persistence/postgres-knowledge.repository';

/** Runs against a disposable migrated DATABASE_URL_TEST; never points at production. */
describe('knowledge ACL and tenant isolation (real PostgreSQL)', () => {
  it('refuses cross-tenant and same-tenant unauthorized access', async () => {
    const connection = process.env.DATABASE_URL_TEST;
    if (!connection)
      throw Error('DATABASE_URL_TEST required for integration test');
    const pool = new Pool({ connectionString: connection, max: 3 });
    const a = randomUUID(),
      b = randomUUID(),
      doc = randomUUID(),
      kb = randomUUID(),
      userA = `test_${randomUUID()}`,
      userB = `test_${randomUUID()}`;
    const organizations = {
      assertMembership: async (actor: { sub: string }, org: string) => {
        if (
          !(
            (actor.sub === userA && org === a) ||
            (actor.sub === userB && org === a)
          )
        )
          throw Error('Unauthorized tenant');
      },
      assertRole: async (actor: { sub: string }) => {
        if (actor.sub !== userA) throw Error('Unauthorized editor');
      },
    };
    const embeddings = {
      model: 'nomic-embed-text',
      embed: async () =>
        Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)),
    };
    const service = new KnowledgeService(
      organizations as never,
      new PostgresKnowledgeRepository(pool),
      embeddings as never,
    );
    try {
      await pool.query(
        `INSERT INTO organizations(id,name) VALUES($1,'tenantA'),($2,'tenantB')`,
        [a, b],
      );
      await pool.query(`INSERT INTO users(id,email) VALUES($1,$3),($2,$4)`, [
        userA,
        userB,
        `${userA}@example.test`,
        `${userB}@example.test`,
      ]);
      await pool.query(
        `INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'viewer')`,
        [a, userA, userB],
      );
      await pool.query(
        `INSERT INTO knowledge_bases(id,organization_id,name) VALUES($1,$2,'private')`,
        [kb, a],
      );
      await pool.query(
        `INSERT INTO knowledge_documents(id,organization_id,knowledge_base_id,title,content,created_by,status,index_model)
    VALUES($1,$2,$3,'private report','confidential forecasting report',$4,'ready','nomic-embed-text')`,
        [doc, a, kb, userA],
      );
      await pool.query(
        `INSERT INTO knowledge_document_acl(document_id,organization_id,user_id,can_read,granted_by)
    VALUES($1,$2,$3,true,$3)`,
        [doc, a, userA],
      );
      await pool.query(
        `INSERT INTO knowledge_chunks(organization_id,document_id,chunk_index,content,embedding,embedding_model,source_version)
    VALUES($1,$2,0,'confidential forecasting report',$3::vector,'nomic-embed-text',1)`,
        [
          a,
          doc,
          `[${Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)).join(',')}]`,
        ],
      );
      const actorA = {
          sub: userA,
          email: `${userA}@example.test`,
          email_verified: true,
        },
        actorB = {
          sub: userB,
          email: `${userB}@example.test`,
          email_verified: true,
        };
      expect(
        (
          await service.search(actorA, {
            organization_id: a,
            knowledge_base_id: kb,
            query: 'forecasting',
          })
        ).results.length,
      ).toBeGreaterThan(0);
      expect(
        (
          await service.search(actorB, {
            organization_id: a,
            knowledge_base_id: kb,
            query: 'forecasting',
          })
        ).results,
      ).toEqual([]);
      await expect(
        service.search(actorB, {
          organization_id: b,
          knowledge_base_id: kb,
          query: 'forecasting',
        }),
      ).rejects.toThrow();
      await service.grantRead(actorA, a, doc, userB);
      expect(
        (
          await service.search(actorB, {
            organization_id: a,
            knowledge_base_id: kb,
            query: 'forecasting',
          })
        ).results.length,
      ).toBeGreaterThan(0);
      await service.revokeRead(actorA, a, doc, userB);
      expect(
        (
          await service.search(actorB, {
            organization_id: a,
            knowledge_base_id: kb,
            query: 'forecasting',
          })
        ).results,
      ).toEqual([]);
    } finally {
      await pool
        .query(
          'DELETE FROM audit_events WHERE organization_id = ANY($1::uuid[])',
          [[a, b]],
        )
        .catch(() => {});
      await pool
        .query('DELETE FROM knowledge_chunks WHERE document_id=$1', [doc])
        .catch(() => {});
      await pool
        .query('DELETE FROM knowledge_document_acl WHERE document_id=$1', [doc])
        .catch(() => {});
      await pool
        .query('DELETE FROM knowledge_documents WHERE id=$1', [doc])
        .catch(() => {});
      await pool
        .query('DELETE FROM knowledge_bases WHERE id=$1', [kb])
        .catch(() => {});
      await pool
        .query(
          'DELETE FROM memberships WHERE organization_id = ANY($1::uuid[])',
          [[a, b]],
        )
        .catch(() => {});
      await pool
        .query('DELETE FROM organizations WHERE id = ANY($1::uuid[])', [[a, b]])
        .catch(() => {});
      await pool
        .query('DELETE FROM users WHERE id = ANY($1::varchar[])', [
          [userA, userB],
        ])
        .catch(() => {});
      await pool.end();
    }
  });
});
