import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { ORGANIZATION_CONSTANTS } from '../../../organizations/constants/organizations.constants';
import { KNOWLEDGE_CONSTANTS } from '../../constants/knowledge.constants';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProviderPort,
} from '../ports/embedding-provider.port';
import {
  KNOWLEDGE_REPOSITORY,
  type KnowledgeRepositoryPort,
} from '../ports/knowledge-repository.port';
import type {
  KnowledgeDocumentInput,
  KnowledgeSearchInput,
} from '../types/knowledge.type';

/** Business orchestration: checks actor authority, delegates storage and model I/O through ports. */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledgeRepository: KnowledgeRepositoryPort,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProviderPort,
  ) {}

  async listBases(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.knowledgeRepository.listBases(organization_id);
  }

  async createBase(actor: Actor, organization_id: string, name: string) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    return this.knowledgeRepository.createBase(
      actor.sub,
      organization_id,
      name,
    );
  }

  async documents(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.knowledgeRepository.documents(actor.sub, organization_id);
  }

  async getDocument(
    actor: Actor,
    organization_id: string,
    document_id: string,
  ) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const doc = await this.knowledgeRepository.getDocument(
      actor.sub,
      organization_id,
      document_id,
    );
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async createDocument(actor: Actor, input: KnowledgeDocumentInput) {
    await this.organizationsService.assertMembership(
      actor,
      input.organization_id,
      true,
    );
    return this.knowledgeRepository.createDocument(actor.sub, input);
  }

  async grantRead(
    actor: Actor,
    organization_id: string,
    document_id: string,
    user_id: string,
  ) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.knowledgeRepository.grantRead(
      actor.sub,
      organization_id,
      document_id,
      user_id,
    );
  }

  async revokeRead(
    actor: Actor,
    organization_id: string,
    document_id: string,
    user_id: string,
  ) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.knowledgeRepository.revokeRead(
      actor.sub,
      organization_id,
      document_id,
      user_id,
    );
  }

  async reindex(actor: Actor, organization_id: string, document_id: string) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.knowledgeRepository.reindex(organization_id, document_id);
  }

  async search(actor: Actor, input: KnowledgeSearchInput) {
    await this.organizationsService.assertMembership(
      actor,
      input.organization_id,
    );
    const vector = await this.embeddingProvider.embed(input.query);
    const results = await this.knowledgeRepository.searchAuthorized(
      actor.sub,
      input,
      vector,
      this.embeddingProvider.model,
    );
    return {
      query: input.query,
      mode: KNOWLEDGE_CONSTANTS.SEARCH_MODE,
      embedding_model: this.embeddingProvider.model,
      results,
    };
  }
}
