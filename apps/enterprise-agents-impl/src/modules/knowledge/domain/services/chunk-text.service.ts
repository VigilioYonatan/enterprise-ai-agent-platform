import { KNOWLEDGE_CONSTANTS } from '@/knowledge/constants/knowledge.constants';

/** Deterministic, bounded text chunks. No model, network, database or transport dependencies. */
export function chunkText(
  text: string,
  max_chars: number = KNOWLEDGE_CONSTANTS.CHUNK_DEFAULT_MAX_CHARACTERS,
  overlap: number = KNOWLEDGE_CONSTANTS.CHUNK_DEFAULT_OVERLAP,
): string[] {
  if (
    !Number.isInteger(max_chars) ||
    max_chars < KNOWLEDGE_CONSTANTS.CHUNK_MIN_CHARACTERS ||
    max_chars > KNOWLEDGE_CONSTANTS.CHUNK_MAX_CHARACTERS
  )
    throw new Error('Invalid chunk size');
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= max_chars / 2)
    throw new Error('Invalid overlap');
  const clean = text.replace(/\r\n/g, '\n').replace(/\0/g, '').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + max_chars);
    if (end < clean.length) {
      const candidate = clean.lastIndexOf(' ', end);
      if (candidate > start + max_chars * 0.6) end = candidate;
    }
    const value = clean.slice(start, end).trim();
    if (value) chunks.push(value);
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
