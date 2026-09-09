import { SEED_USERS } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import type {
  KnowledgeBaseSchema,
  KnowledgeDocumentAclSchema,
  KnowledgeDocumentSchema,
} from '@/knowledge/domain/schemas/knowledge.schema';
import { SEED_ORGS } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import {
  knowledgeBases,
  knowledgeDocumentAcl,
  knowledgeDocuments,
} from '~/database/schema';
import type { AppDatabase } from '~/shared/database/database.module';

export const SEED_KNOWLEDGE = {
  kb_sre_id:
    'fb111111-1111-4111-8111-111111111111' as KnowledgeBaseSchema['id'],
  kb_soc2_id:
    'fb222222-2222-4222-8222-222222222222' as KnowledgeBaseSchema['id'],
  doc_failover_id:
    'fc111111-1111-4111-8111-111111111111' as KnowledgeDocumentSchema['id'],
  doc_zero_trust_id:
    'fc222222-2222-4222-8222-222222222222' as KnowledgeDocumentSchema['id'],
};

export class KnowledgeSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    const kb_fixtures: Array<{
      id: KnowledgeBaseSchema['id'];
      organization_id: KnowledgeBaseSchema['organization_id'];
      name: KnowledgeBaseSchema['name'];
    }> = [
      {
        id: SEED_KNOWLEDGE.kb_sre_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'SRE Reliability Runbooks',
      },
      {
        id: SEED_KNOWLEDGE.kb_soc2_id,
        organization_id: SEED_ORGS.acme_id,
        name: 'Security Compliance & SOC2 Standards',
      },
    ];

    for (const fixture of kb_fixtures) {
      await this.db
        .insert(knowledgeBases)
        .values(fixture)
        .onConflictDoUpdate({
          target: knowledgeBases.id,
          set: { name: fixture.name },
        });
    }

    const doc_fixtures: Array<{
      id: KnowledgeDocumentSchema['id'];
      organization_id: KnowledgeDocumentSchema['organization_id'];
      knowledge_base_id: KnowledgeDocumentSchema['knowledge_base_id'];
      title: KnowledgeDocumentSchema['title'];
      content: KnowledgeDocumentSchema['content'];
      created_by: KnowledgeDocumentSchema['created_by'];
      status: KnowledgeDocumentSchema['status'];
      index_model: KnowledgeDocumentSchema['index_model'];
      source_version: KnowledgeDocumentSchema['source_version'];
    }> = [
      {
        id: SEED_KNOWLEDGE.doc_failover_id,
        organization_id: SEED_ORGS.acme_id,
        knowledge_base_id: SEED_KNOWLEDGE.kb_sre_id,
        title: 'PostgreSQL Failover & Disaster Recovery Playbook',
        content:
          'Step 1: Check replication lag before promoting standby replica. Step 2: Update DNS.',
        created_by: SEED_USERS.admin_id,
        status: 'ready',
        index_model: 'nomic-embed-text',
        source_version: 1,
      },
      {
        id: SEED_KNOWLEDGE.doc_zero_trust_id,
        organization_id: SEED_ORGS.acme_id,
        knowledge_base_id: SEED_KNOWLEDGE.kb_sre_id,
        title: 'Zero-Trust Network Perimeter & Micro-segmentation',
        content:
          'All ingress traffic must pass through mutual TLS and Keycloak JWT verification.',
        created_by: SEED_USERS.admin_id,
        status: 'ready',
        index_model: 'nomic-embed-text',
        source_version: 1,
      },
    ];

    for (const fixture of doc_fixtures) {
      await this.db
        .insert(knowledgeDocuments)
        .values(fixture)
        .onConflictDoNothing({ target: knowledgeDocuments.id });
    }

    const acl_fixtures: Array<{
      document_id: KnowledgeDocumentAclSchema['document_id'];
      organization_id: KnowledgeDocumentAclSchema['organization_id'];
      user_id: KnowledgeDocumentAclSchema['user_id'];
      can_read: KnowledgeDocumentAclSchema['can_read'];
      granted_by: KnowledgeDocumentAclSchema['granted_by'];
    }> = [
      {
        document_id: SEED_KNOWLEDGE.doc_failover_id,
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.engineer_id,
        can_read: true,
        granted_by: SEED_USERS.admin_id,
      },
      {
        document_id: SEED_KNOWLEDGE.doc_zero_trust_id,
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.engineer_id,
        can_read: true,
        granted_by: SEED_USERS.admin_id,
      },
      {
        document_id: SEED_KNOWLEDGE.doc_failover_id,
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.admin_id,
        can_read: true,
        granted_by: SEED_USERS.admin_id,
      },
      {
        document_id: SEED_KNOWLEDGE.doc_zero_trust_id,
        organization_id: SEED_ORGS.acme_id,
        user_id: SEED_USERS.admin_id,
        can_read: true,
        granted_by: SEED_USERS.admin_id,
      },
    ];

    for (const fixture of acl_fixtures) {
      await this.db
        .insert(knowledgeDocumentAcl)
        .values(fixture)
        .onConflictDoNothing({
          target: [
            knowledgeDocumentAcl.document_id,
            knowledgeDocumentAcl.user_id,
          ],
        });
    }
  }
}
