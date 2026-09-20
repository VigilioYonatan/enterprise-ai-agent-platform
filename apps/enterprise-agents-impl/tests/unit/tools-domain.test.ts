import { describe, expect, it } from 'vitest';
import { runAllowedTool } from '@/tools/domain/policies/tool-registry.policy';

describe('Allowlisted tools', () => {
  it('transforms bounded text locally', () => {
    expect(runAllowedTool('text.uppercase', { value: 'hello' }, {})).toBe(
      'HELLO',
    );
    expect(runAllowedTool('text.lowercase', { value: 'WORLD' }, {})).toBe(
      'world',
    );
  });
  it('picks allowed JSON properties securely', () => {
    expect(
      runAllowedTool(
        'json.pick',
        { status: 'healthy', count: 42 },
        { field: 'status' },
      ),
    ).toBe('healthy');
  });
  it('rejects arbitrary network tools', () =>
    expect(() =>
      runAllowedTool('http.request', { url: 'http://localhost' }, {}),
    ).toThrow('not in allowlist'));
  it('rejects missing or invalid JSON property', () => {
    expect(() =>
      runAllowedTool('json.pick', { foo: 'bar' }, { field: 'missing' }),
    ).toThrow('missing');
    expect(() =>
      runAllowedTool(
        'json.pick',
        { foo: 'bar' },
        { field: 123 as unknown as string },
      ),
    ).toThrow('missing');
  });
});
