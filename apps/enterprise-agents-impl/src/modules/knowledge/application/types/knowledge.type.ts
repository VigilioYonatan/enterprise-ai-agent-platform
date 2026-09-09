import type {
  KnowledgeBaseSchema,
  KnowledgeChunkSchema,
  KnowledgeDocumentSchema,
} from '../../domain/schemas/knowledge.schema';

export type KnowledgeDocumentInput = Pick<
  KnowledgeDocumentSchema,
  'organization_id' | 'knowledge_base_id' | 'title' | 'content'
>;

export type KnowledgeSearchInput = Pick<
  KnowledgeDocumentSchema,
  'organization_id' | 'knowledge_base_id'
> & {
  query: string;
};

export type KnowledgeBaseSummary = Pick<
  KnowledgeBaseSchema,
  'id' | 'name' | 'created_at'
>;

export type KnowledgeBaseCreatedSummary = Pick<
  KnowledgeBaseSchema,
  'id' | 'name'
>;

export type KnowledgeDocumentSummary = Pick<
  KnowledgeDocumentSchema,
  | 'id'
  | 'title'
  | 'knowledge_base_id'
  | 'status'
  | 'index_model'
  | 'index_error'
  | 'indexed_at'
  | 'created_at'
>;

export type KnowledgeDocumentDetail = Pick<
  KnowledgeDocumentSchema,
  | 'id'
  | 'title'
  | 'content'
  | 'knowledge_base_id'
  | 'created_by'
  | 'status'
  | 'source_version'
  | 'index_model'
  | 'index_error'
  | 'indexed_at'
  | 'created_at'
>;

export type KnowledgeDocumentCreatedSummary = Pick<
  KnowledgeDocumentSchema,
  'id' | 'title' | 'status'
>;

export type KnowledgeDocumentReindexedSummary = Pick<
  KnowledgeDocumentSchema,
  'id' | 'status'
>;

export type KnowledgeSearchChunkResult = Pick<
  KnowledgeChunkSchema,
  'id' | 'document_id' | 'source_version'
> & {
  title: KnowledgeDocumentSchema['title'];
  excerpt: KnowledgeChunkSchema['content'];
  score: number;
};
