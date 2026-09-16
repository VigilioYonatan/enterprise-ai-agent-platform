import 'reflect-metadata';
import {
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { chunkText } from '@/knowledge/domain/services/chunk-text.service';
import type { KnowledgeDocumentSchema } from './modules/knowledge/domain/schemas/knowledge.schema';
import { OllamaEmbeddingAdapter } from './modules/knowledge/infrastructure/embeddings/ollama-embedding.adapter';
import { AppConfigModule } from './shared/config/app-config.module';
import { DatabaseModule } from './shared/database/database.module';

type KnowledgeIndexJob = Pick<
  KnowledgeDocumentSchema,
  'id' | 'organization_id' | 'content' | 'source_version'
>;
/** Durable indexing worker; never indexes across tenant boundaries. */
@Injectable()
class KnowledgeIndexer implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;
  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly embeddings: OllamaEmbeddingAdapter,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 2500);
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async tick() {
    if (this.busy) return;
    this.busy = true;
    let job: KnowledgeIndexJob | undefined;
    try {
      const claimed =
        await this.pool.query<KnowledgeIndexJob>(`WITH picked AS (SELECT id FROM knowledge_documents
     WHERE (status='pending' AND (lease_until IS NULL OR lease_until<now()))
       OR (status='processing' AND lease_until<now())
     ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     UPDATE knowledge_documents d SET status='processing',lease_until=now()+interval '5 minutes',attempts=attempts+1,index_error=NULL
     FROM picked WHERE d.id=picked.id RETURNING d.id,d.organization_id,d.content,d.source_version`);
      job = claimed.rows[0];
      if (!job) return;
      const chunks = chunkText(job.content);
      if (!chunks.length) throw new Error('Empty source content');
      const vectors: number[][] = [];
      for (const chunk of chunks)
        vectors.push(await this.embeddings.embed(chunk));
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const current = await client.query(
          `SELECT id FROM knowledge_documents
      WHERE id=$1 AND organization_id=$2 AND source_version=$3 AND status='processing' AND lease_until>now() FOR UPDATE`,
          [job.id, job.organization_id, job.source_version],
        );
        if (!current.rowCount) {
          await client.query('ROLLBACK');
          return;
        }
        await client.query(
          'DELETE FROM knowledge_chunks WHERE document_id=$1 AND organization_id=$2',
          [job.id, job.organization_id],
        );
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++)
          await client.query(
            `INSERT INTO knowledge_chunks(organization_id,document_id,chunk_index,content,embedding,embedding_model,source_version)
      VALUES($1,$2,$3,$4,$5::vector,$6,$7)`,
            [
              job.organization_id,
              job.id,
              chunkIndex,
              chunks[chunkIndex],
              `[${vectors[chunkIndex].join(',')}]`,
              this.embeddings.model,
              job.source_version,
            ],
          );
        await client.query(
          `UPDATE knowledge_documents SET status='ready',lease_until=NULL,index_model=$2,indexed_at=now(),index_error=NULL
      WHERE id=$1`,
          [job.id, this.embeddings.model],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Indexing failed';
      console.error('Knowledge indexing:', message);
      if (job)
        await this.pool
          .query(
            `UPDATE knowledge_documents SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'pending' END,
    lease_until=CASE WHEN attempts>=3 THEN NULL ELSE now()+make_interval(secs=>power(2,attempts)::int) END,
    index_error=left($2,180) WHERE id=$1 AND source_version=$3 AND status='processing'`,
            [job.id, message, job.source_version],
          )
          .catch(() => {});
    } finally {
      this.busy = false;
    }
  }
}
@Module({
  imports: [AppConfigModule, DatabaseModule],
  providers: [KnowledgeIndexer, OllamaEmbeddingAdapter],
})
class KnowledgeWorkerModule {}
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    KnowledgeWorkerModule,
    { bufferLogs: true },
  );
  process.on('SIGTERM', () => void app.close());
  process.on('SIGINT', () => void app.close());
}
bootstrap().catch((error) => {
  console.error('Indexer startup failed', error);
  process.exitCode = 1;
});
