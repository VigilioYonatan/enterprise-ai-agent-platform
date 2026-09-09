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
} from '../types/knowledge.type';

/** Owned by Knowledge, implemented only by a PostgreSQL adapter. No Nest/SQL types. */
export const KNOWLEDGE_REPOSITORY = Symbol('KNOWLEDGE_REPOSITORY');

export interface KnowledgeRepositoryPort {
  listBases(organization_id: string): Promise<KnowledgeBaseSummary[]>;
  createBase(
    actor_id: string,
    organization_id: string,
    name: string,
  ): Promise<KnowledgeBaseCreatedSummary>;
  documents(
    actor_id: string,
    organization_id: string,
  ): Promise<KnowledgeDocumentSummary[]>;
  getDocument(
    actor_id: string,
    organization_id: string,
    document_id: string,
  ): Promise<KnowledgeDocumentDetail | null>;
  createDocument(
    actor_id: string,
    input: KnowledgeDocumentInput,
  ): Promise<KnowledgeDocumentCreatedSummary>;
  grantRead(
    actor_id: string,
    organization_id: string,
    document_id: string,
    user_id: string,
  ): Promise<{ granted: boolean }>;
  revokeRead(
    actor_id: string,
    organization_id: string,
    document_id: string,
    user_id: string,
  ): Promise<{ revoked: boolean }>;
  reindex(
    organization_id: string,
    document_id: string,
  ): Promise<KnowledgeDocumentReindexedSummary>;
  searchAuthorized(
    actor_id: string,
    input: KnowledgeSearchInput,
    vector: number[],
    model: string,
  ): Promise<KnowledgeSearchChunkResult[]>;
}
