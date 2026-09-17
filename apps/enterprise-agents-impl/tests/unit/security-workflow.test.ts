import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  graphSchema,
  graphViolations,
} from '../../src/modules/workflows/domain/schemas/workflow.schema';

describe('workflow graph security and integrity', () => {
  it('rejects a forged unexpected field in a node', () => {
    const parsed = graphSchema.safeParse({
      nodes: [
        { id: 'start', type: 'start', label: 'Start', tenant_id: 'forged' },
      ],
      edges: [],
    });
    expect(parsed.success).toBe(false);
  });
  it('rejects disconnected nodes even when edge syntax is valid', () => {
    const parsed = graphSchema.parse({
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        { id: 'output', type: 'output', label: 'Output' },
      ],
      edges: [],
    });
    expect(graphViolations(parsed, true)).toContain(
      'All nodes must be reachable from start',
    );
  });
  it('rejects tool execution without allowlist identity', () => {
    const parsed = graphSchema.parse({
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        {
          id: 'tool',
          type: 'tool',
          label: 'Tool',
          config: { tool_key: 'exec.shell' },
        },
        { id: 'end', type: 'output', label: 'End' },
      ],
      edges: [
        { source: 'start', target: 'tool' },
        { source: 'tool', target: 'end' },
      ],
    });
    expect(graphViolations(parsed, true)).toContain(
      'Tool node tool must use an allowlisted tool_key',
    );
  });
  it('binds approval request hash to exact arguments', () => {
    const hash = (args: unknown) =>
      createHash('sha256').update(JSON.stringify(args)).digest('hex');
    expect(
      hash({ tool: 'text.uppercase', payload: { value: 'one' } }),
    ).not.toBe(hash({ tool: 'text.uppercase', payload: { value: 'two' } }));
  });
});
