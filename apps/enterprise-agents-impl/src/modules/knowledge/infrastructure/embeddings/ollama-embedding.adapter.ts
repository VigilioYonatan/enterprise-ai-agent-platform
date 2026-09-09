import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import type { EmbeddingProviderPort } from '../../application/ports/embedding-provider.port';
import { KNOWLEDGE_CONSTANTS } from '../../constants/knowledge.constants';

const EMBEDDING_DIMENSION = KNOWLEDGE_CONSTANTS.EMBEDDING_DIMENSION;

/** Local Ollama /api/embed only; never forwards document content to a cloud provider. */
@Injectable()
export class OllamaEmbeddingAdapter implements EmbeddingProviderPort {
  readonly model: string;

  constructor(
    private readonly configService: AppConfigService = new AppConfigService(),
  ) {
    this.model =
      this.configService.knowledge_embed_model ||
      KNOWLEDGE_CONSTANTS.DEFAULT_EMBEDDING_MODEL;
  }

  async embed(text: string): Promise<number[]> {
    const base = this.configService.ollama_url;
    if (!base)
      throw new ServiceUnavailableException(
        'Local embedding service is not configured',
      );
    let response: Response;
    try {
      response = await fetch(new URL('/api/embed', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(KNOWLEDGE_CONSTANTS.EMBEDDING_TIMEOUT_MS),
        body: JSON.stringify({
          model: this.model,
          input: text,
          truncate: false,
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Local embedding service unavailable',
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        `Local embedding service failed (${response.status})`,
      );
    const body = (await response.json()) as { embeddings?: unknown };
    const vector = Array.isArray(body.embeddings)
      ? body.embeddings[0]
      : undefined;
    if (
      !Array.isArray(vector) ||
      vector.length !== EMBEDDING_DIMENSION ||
      !vector.every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      )
    )
      throw new ServiceUnavailableException(
        `Expected ${EMBEDDING_DIMENSION}-dimensional local embeddings`,
      );
    return vector as number[];
  }
}
