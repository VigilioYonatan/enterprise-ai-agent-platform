/** Only the knowledge application depends on this interface; adapters own Ollama details. */
export interface EmbeddingProviderPort {
  embed(text: string): Promise<number[]>;
  readonly model: string;
}
export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
