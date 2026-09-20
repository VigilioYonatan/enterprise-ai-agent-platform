import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { EmbeddingProviderPort } from '../../src/modules/knowledge/application/ports/embedding-provider.port';
import type { KnowledgeRepositoryPort } from '../../src/modules/knowledge/application/ports/knowledge-repository.port';
import { KnowledgeService } from '../../src/modules/knowledge/application/service/knowledge.service';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';

const actor = {
  sub: 'user-1',
  email: 'u1@agentops.local',
  email_verified: true,
};
const orgId = '11111111-1111-4111-8111-111111111111';
const kbId = '22222222-2222-4222-8222-222222222222';
const docId = '33333333-3333-4333-8333-333333333333';

describe('KnowledgeService', () => {
  it('enforces ACL-aware document operations and hybrid search', async () => {
    const repo: KnowledgeRepositoryPort = {
      listBases: vi.fn().mockResolvedValue([{ id: kbId, name: 'Runbooks' }]),
      createBase: vi.fn().mockResolvedValue({ id: kbId, name: 'Runbooks' }),
      documents: vi.fn().mockResolvedValue([{ id: docId, title: 'SOP' }]),
      getDocument: vi.fn().mockResolvedValue({
        id: docId,
        title: 'SOP',
        content: 'Detailed SOP content',
      }),
      createDocument: vi
        .fn()
        .mockResolvedValue({ id: docId, title: 'SOP', status: 'pending' }),
      grantRead: vi.fn().mockResolvedValue({ granted: true }),
      revokeRead: vi.fn().mockResolvedValue({ revoked: true }),
      reindex: vi.fn().mockResolvedValue({ id: docId, status: 'pending' }),
      searchAuthorized: vi
        .fn()
        .mockResolvedValue([
          { id: 'c1', document_id: docId, title: 'SOP', score: 0.032 },
        ]),
    };
    const embeddings: EmbeddingProviderPort = {
      model: 'nomic-embed-text',
      embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    const orgs = {
      assertMembership: vi.fn().mockResolvedValue(null),
      assertRole: vi.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const service = new KnowledgeService(orgs, repo, embeddings);

    expect(await service.listBases(actor, orgId)).toHaveLength(1);
    expect(await service.createBase(actor, orgId, 'Runbooks')).toMatchObject({
      id: kbId,
    });
    expect(await service.documents(actor, orgId)).toHaveLength(1);
    expect(await service.getDocument(actor, orgId, docId)).toMatchObject({
      id: docId,
    });
    expect(
      await service.createDocument(actor, {
        organization_id: orgId,
        knowledge_base_id: kbId,
        title: 'SOP',
        content: 'Detailed SOP content',
      }),
    ).toMatchObject({ status: 'pending' });
    expect(await service.grantRead(actor, orgId, docId, 'user-2')).toEqual({
      granted: true,
    });
    expect(await service.revokeRead(actor, orgId, docId, 'user-2')).toEqual({
      revoked: true,
    });
    expect(await service.reindex(actor, orgId, docId)).toEqual({
      id: docId,
      status: 'pending',
    });

    const search = await service.search(actor, {
      organization_id: orgId,
      knowledge_base_id: kbId,
      query: 'incident response',
    });
    expect(search.mode).toBe('hybrid_pgvector_fts_rrf');
    expect(search.results).toHaveLength(1);

    vi.mocked(repo.getDocument).mockResolvedValueOnce(null);
    await expect(service.getDocument(actor, orgId, docId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
