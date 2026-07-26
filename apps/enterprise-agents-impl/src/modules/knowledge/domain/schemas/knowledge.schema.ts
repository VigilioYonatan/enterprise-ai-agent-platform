import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../../identity/constants/identity.constants';
import { KNOWLEDGE_CONSTANTS } from '../../constants/knowledge.constants';

export const knowledgeBaseSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(
      KNOWLEDGE_CONSTANTS.MIN_BASE_NAME_LENGTH,
      'Knowledge base name must have at least 2 characters',
    )
    .max(KNOWLEDGE_CONSTANTS.MAX_BASE_NAME_LENGTH),
  created_at: z.date(),
});

export type KnowledgeBaseSchema = z.infer<typeof knowledgeBaseSchema>;

export const knowledgeDocumentSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  knowledge_base_id: z.uuid(),
  title: z
    .string()
    .trim()
    .min(
      KNOWLEDGE_CONSTANTS.MIN_DOCUMENT_TITLE_LENGTH,
      'Document title is required',
    )
    .max(KNOWLEDGE_CONSTANTS.MAX_DOCUMENT_TITLE_LENGTH),
  content: z
    .string()
    .trim()
    .min(
      KNOWLEDGE_CONSTANTS.MIN_DOCUMENT_CONTENT_LENGTH,
      'Document text must contain at least 10 characters',
    )
    .max(KNOWLEDGE_CONSTANTS.MAX_DOCUMENT_CONTENT_LENGTH),
  created_by: z
    .string()
    .min(1)
    .max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH)
    .nullable(),
  status: z.enum(KNOWLEDGE_CONSTANTS.DOCUMENT_STATUSES),
  index_model: z.string().max(KNOWLEDGE_CONSTANTS.MAX_MODEL_LENGTH).nullable(),
  source_version: z.number().int().positive(),
  indexed_at: z.date().nullable(),
  index_error: z.string().nullable(),
  lease_until: z.date().nullable(),
  attempts: z.number().int().nonnegative(),
  created_at: z.date(),
});

export type KnowledgeDocumentSchema = z.infer<typeof knowledgeDocumentSchema>;

export const knowledgeDocumentAclSchema = z.object({
  document_id: z.uuid(),
  organization_id: z.uuid(),
  user_id: z.string().trim().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  can_read: z.boolean(),
  granted_by: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  granted_at: z.date(),
});

export type KnowledgeDocumentAclSchema = z.infer<
  typeof knowledgeDocumentAclSchema
>;

export const knowledgeChunkSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  document_id: z.uuid(),
  chunk_index: z.number().int().nonnegative(),
  content: z.string(),
  embedding_model: z.string().max(KNOWLEDGE_CONSTANTS.MAX_MODEL_LENGTH),
  source_version: z.number().int().positive(),
  created_at: z.date(),
});

export type KnowledgeChunkSchema = z.infer<typeof knowledgeChunkSchema>;
