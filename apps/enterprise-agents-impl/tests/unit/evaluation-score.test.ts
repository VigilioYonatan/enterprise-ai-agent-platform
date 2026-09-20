import { describe, expect, it } from 'vitest';
import { exactMatchScore } from '../../src/modules/evaluations/domain/schemas/evaluation.schema';

describe('Deterministic evaluation score', () => {
  it('normalizes whitespace and case', () =>
    expect(exactMatchScore(' Hello  World ', 'hello world')).toBe(1));
  it('penalizes mismatch', () =>
    expect(exactMatchScore('expected', 'different')).toBe(0));
});
