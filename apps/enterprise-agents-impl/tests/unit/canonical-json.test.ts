import { describe, expect, it } from 'vitest';
import { canonicalJson } from '@/runs/domain/services/canonical-json.service';

describe('Run idempotency payload comparison', () => {
  it('ignores object property order recursively', () => {
    expect(canonicalJson({ input: { b: 2, a: 1 }, flags: ['x', 'y'] })).toBe(
      canonicalJson({ flags: ['x', 'y'], input: { a: 1, b: 2 } }),
    );
  });
  it('rejects a different payload', () => {
    expect(canonicalJson({ input: { a: 1 } })).not.toBe(
      canonicalJson({ input: { a: 2 } }),
    );
  });
});
