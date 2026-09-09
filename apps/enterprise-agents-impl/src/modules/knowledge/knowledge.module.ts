import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EMBEDDING_PROVIDER } from './application/ports/embedding-provider.port';
import { KNOWLEDGE_REPOSITORY } from './application/ports/knowledge-repository.port';
import { KnowledgeService } from './application/service/knowledge.service';
import { OllamaEmbeddingAdapter } from './infrastructure/embeddings/ollama-embedding.adapter';
import { PostgresKnowledgeRepository } from './infrastructure/persistence/postgres-knowledge.repository';
import { KnowledgeController } from './presentation/http/controllers/knowledge.controller';
@Module({
  imports: [OrganizationsModule],
  controllers: [KnowledgeController],
  exports: [KnowledgeService],
  providers: [
    KnowledgeService,
    { provide: KNOWLEDGE_REPOSITORY, useClass: PostgresKnowledgeRepository },
    { provide: EMBEDDING_PROVIDER, useClass: OllamaEmbeddingAdapter },
  ],
})
export class KnowledgeModule {}
