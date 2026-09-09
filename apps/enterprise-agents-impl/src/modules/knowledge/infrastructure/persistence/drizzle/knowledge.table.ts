import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '@/identity/infrastructure/persistence/drizzle/user.table';
import type { KnowledgeDocumentSchema } from '@/knowledge/domain/schemas/knowledge.schema';
import { organizations } from '@/organizations/infrastructure/persistence/drizzle/organization.table';

export const knowledgeBases = pgTable(
  'knowledge_bases',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    name: varchar({ length: 120 }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('kb_org_idx').on(t.organization_id)],
);

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    knowledge_base_id: uuid()
      .notNull()
      .references(() => knowledgeBases.id),
    title: varchar({ length: 180 }).notNull(),
    content: text().notNull(),
    created_by: varchar({ length: 128 }),
    status: varchar({ length: 16 })
      .$type<KnowledgeDocumentSchema['status']>()
      .notNull()
      .default('pending'),
    index_model: varchar({ length: 120 }),
    source_version: integer().notNull().default(1),
    indexed_at: timestamp({ withTimezone: true }),
    index_error: text(),
    lease_until: timestamp({ withTimezone: true }),
    attempts: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('kd_base_idx').on(t.knowledge_base_id),
    index('knowledge_pending_idx').on(t.status, t.lease_until, t.created_at),
  ],
);

export const knowledgeDocumentAcl = pgTable(
  'knowledge_document_acl',
  {
    document_id: uuid()
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    user_id: varchar({ length: 128 })
      .notNull()
      .references(() => users.id),
    can_read: boolean().notNull().default(true),
    granted_by: varchar({ length: 128 }).notNull(),
    granted_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.document_id, t.user_id] }),
    index('knowledge_acl_actor_idx').on(t.organization_id, t.user_id),
  ],
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid().defaultRandom().primaryKey(),
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id),
    document_id: uuid()
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    chunk_index: integer().notNull(),
    content: text().notNull(),
    embedding_model: varchar({ length: 120 }).notNull(),
    source_version: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('knowledge_chunks_tenant_doc_idx').on(
      t.organization_id,
      t.document_id,
    ),
    uniqueIndex('knowledge_chunks_doc_ver_idx').on(
      t.document_id,
      t.source_version,
      t.chunk_index,
    ),
  ],
);
