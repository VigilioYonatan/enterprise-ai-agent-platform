import { describe, expect, it } from 'vitest';
import { chunkText } from '@/knowledge/domain/services/chunk-text.service';

describe('knowledge chunking invariants', () => {
  it('preserves text within bounded deterministic chunks', () => {
    const input = 'paragraph '.repeat(360).trim();
    const chunks = chunkText(input, 450, 60);
    expect(chunks.length).toBeGreaterThan(3);
    expect(
      chunks.every((chunk) => chunk.length <= 450 && chunk.length > 0),
    ).toBe(true);
    expect(chunkText(input, 450, 60)).toEqual(chunks);
    expect(chunks[0]).toContain('paragraph');
  });
  it('rejects invalid parameters and empty content', () => {
    expect(chunkText('  ')).toEqual([]);
    expect(() => chunkText('text', 100, 90)).toThrow();
    expect(() => chunkText('text', 99, 10)).toThrow();
  });
  it('handles multi-line data without null bytes', () => {
    expect(chunkText('A\r\nB\0')).toEqual(['A\nB']);
  });
});
