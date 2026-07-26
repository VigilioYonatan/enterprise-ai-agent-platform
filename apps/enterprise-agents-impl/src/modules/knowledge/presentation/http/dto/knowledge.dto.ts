import { z } from 'zod';
import { KNOWLEDGE_CONSTANTS } from '../../../constants/knowledge.constants';
import {
  knowledgeBaseSchema,
  knowledgeChunkSchema,
  knowledgeDocumentAclSchema,
  knowledgeDocumentSchema,
} from '../../../domain/schemas/knowledge.schema';

export const knowledgeBaseQueryDto = knowledgeBaseSchema.pick({
  organization_id: true,
});
export type KnowledgeBaseQueryDto = z.output<typeof knowledgeBaseQueryDto>;

export const createKnowledgeBaseDto = knowledgeBaseSchema
  .pick({
    organization_id: true,
    name: true,
  })
  .strict();
export type CreateKnowledgeBaseDto = z.output<typeof createKnowledgeBaseDto>;

export const createDocumentDto = knowledgeDocumentSchema
  .pick({
    organization_id: true,
    knowledge_base_id: true,
    title: true,
    content: true,
  })
  .strict();
export type CreateDocumentDto = z.output<typeof createDocumentDto>;

export const searchKnowledgeDto = knowledgeDocumentSchema
  .pick({
    organization_id: true,
    knowledge_base_id: true,
  })
  .extend({
    query: z
      .string()
      .trim()
      .min(
        KNOWLEDGE_CONSTANTS.MIN_SEARCH_QUERY_LENGTH,
        'Query must have at least 2 characters',
      )
      .max(KNOWLEDGE_CONSTANTS.MAX_SEARCH_QUERY_LENGTH),
  })
  .strict();
export type SearchKnowledgeDto = z.output<typeof searchKnowledgeDto>;

export const documentGrantDto = knowledgeDocumentAclSchema
  .pick({
    organization_id: true,
    user_id: true,
  })
  .strict();
export type DocumentGrantDto = z.output<typeof documentGrantDto>;

export const reindexDto = knowledgeDocumentSchema
  .pick({ organization_id: true })
  .strict();
export type ReindexDto = z.output<typeof reindexDto>;

export const knowledgeUserIdParam = knowledgeDocumentAclSchema.shape.user_id;

export const knowledgeBaseResponseDto = knowledgeBaseSchema
  .pick({
    id: true,
    name: true,
  })
  .extend({
    created_at: z.union([z.date(), z.string()]).optional(),
  });
export type KnowledgeBaseResponseDto = z.output<
  typeof knowledgeBaseResponseDto
>;

export const knowledgeDocumentResponseDto = knowledgeDocumentSchema.pick({
  id: true,
  title: true,
  knowledge_base_id: true,
  status: true,
  index_model: true,
  index_error: true,
});
export type KnowledgeDocumentResponseDto = z.output<
  typeof knowledgeDocumentResponseDto
>;

export const knowledgeDocumentCreatedResponseDto = knowledgeDocumentSchema.pick(
  {
    id: true,
    title: true,
    status: true,
  },
);
export type KnowledgeDocumentCreatedResponseDto = z.output<
  typeof knowledgeDocumentCreatedResponseDto
>;

export const documentGrantResponseDto = z.object({
  granted: z.boolean(),
});
export type DocumentGrantResponseDto = z.output<
  typeof documentGrantResponseDto
>;

export const documentRevokeResponseDto = z.object({
  revoked: z.boolean(),
});
export type DocumentRevokeResponseDto = z.output<
  typeof documentRevokeResponseDto
>;

export const documentReindexResponseDto = knowledgeDocumentSchema.pick({
  id: true,
  status: true,
});
export type DocumentReindexResponseDto = z.output<
  typeof documentReindexResponseDto
>;

export const knowledgeSearchChunkResponseDto = knowledgeChunkSchema
  .pick({
    id: true,
    document_id: true,
    source_version: true,
  })
  .extend({
    title: knowledgeDocumentSchema.shape.title,
    excerpt: knowledgeChunkSchema.shape.content,
    score: z.number(),
  });
export type KnowledgeSearchChunkResponseDto = z.output<
  typeof knowledgeSearchChunkResponseDto
>;

export const knowledgeSearchResponseDto = z.object({
  query: z.string(),
  mode: z.string(),
  embedding_model: z.string(),
  results: z.array(knowledgeSearchChunkResponseDto),
});
export type KnowledgeSearchResponseDto = z.output<
  typeof knowledgeSearchResponseDto
>;
