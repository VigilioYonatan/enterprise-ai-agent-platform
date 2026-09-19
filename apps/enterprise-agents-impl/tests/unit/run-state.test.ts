import { describe, expect, it } from 'vitest';
import {
  canTransition,
  nextNode,
} from '@/runs/domain/services/run-state.service';

describe('Run engine pure rules', () => {
  it('never reopens a completed run', () =>
    expect(canTransition('completed', 'queued')).toBe(false));
  it('can resume after approval', () =>
    expect(canTransition('waiting_approval', 'queued')).toBe(true));
  it('selects conditional edge', () =>
    expect(
      nextNode(
        [
          { source: 'c', target: 'a', when: 'true' },
          { source: 'c', target: 'b', when: 'false' },
        ],
        'c',
        false,
      ),
    ).toBe('b'));
  it('fails closed for ambiguous edges', () =>
    expect(() =>
      nextNode(
        [
          { source: 'a', target: 'b' },
          { source: 'a', target: 'c' },
        ],
        'a',
      ),
    ).toThrow());
});
