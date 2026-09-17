import { describe, expect, it } from 'vitest';
import {
  graphSchema,
  graphViolations,
} from '../../src/modules/workflows/domain/schemas/workflow.schema';

describe('Workflow publication invariants', () => {
  it('rejects missing start and output', () =>
    expect(graphViolations({ nodes: [], edges: [] }, true)).toContain(
      'Exactly one start node is required',
    ));
  it('rejects a cycle', () =>
    expect(
      graphViolations(
        {
          nodes: [
            { id: 'a', type: 'start', label: 'Start' },
            { id: 'b', type: 'output', label: 'Output' },
          ],
          edges: [
            { source: 'a', target: 'b' },
            { source: 'b', target: 'a' },
          ],
        },
        true,
      ),
    ).toContain('Cycles are not allowed'));
  it('accepts executable directed acyclic graph', () =>
    expect(
      graphViolations(
        {
          nodes: [
            { id: 'a', type: 'start', label: 'Start' },
            { id: 'b', type: 'output', label: 'Output' },
          ],
          edges: [{ source: 'a', target: 'b' }],
        },
        true,
      ),
    ).toEqual([]));
  it('blocks unsafe tool identifier', () =>
    expect(
      graphViolations(
        {
          nodes: [
            { id: 'a', type: 'start', label: 'Start' },
            {
              id: 'b',
              type: 'tool',
              label: 'unsafe',
              config: { tool_key: 'shell.exec' },
            },
            { id: 'c', type: 'output', label: 'Output' },
          ],
          edges: [
            { source: 'a', target: 'b' },
            { source: 'b', target: 'c' },
          ],
        },
        true,
      ),
    ).toContain('Tool node b must use an allowlisted tool_key'));
  it('rejects non-terminal output', () =>
    expect(
      graphViolations(
        {
          nodes: [
            { id: 'a', type: 'start', label: 'Start' },
            { id: 'b', type: 'output', label: 'Output' },
          ],
          edges: [
            { source: 'a', target: 'b' },
            { source: 'b', target: 'a' },
          ],
        },
        true,
      ),
    ).toContain('Output node b must be terminal'));
  it('rejects unknown graph keys', () =>
    expect(
      graphSchema.safeParse({ nodes: [], edges: [], unexpected: 1 }).success,
    ).toBe(false));
  it('enforces reachability, tool requirements, condition branches, and valid agent configs', () => {
    // Unreachable node
    const unreachableViolations = graphViolations(
      {
        nodes: [
          { id: 'start', type: 'start', label: 'Start' },
          {
            id: 'orphan',
            type: 'tool',
            label: 'Orphan',
            config: { tool_key: 'text.uppercase' },
          },
          { id: 'out', type: 'output', label: 'End' },
        ],
        edges: [{ source: 'start', target: 'out' }],
      },
      true,
    );
    expect(unreachableViolations).toContain(
      'All nodes must be reachable from start',
    );

    // Condition node missing true and false branches and config
    const condViolations = graphViolations(
      {
        nodes: [
          { id: 'start', type: 'start', label: 'Start' },
          { id: 'cond', type: 'condition', label: 'Check', config: {} },
          { id: 'out', type: 'output', label: 'End' },
        ],
        edges: [
          { source: 'start', target: 'cond' },
          { source: 'cond', target: 'out' },
        ],
      },
      true,
    );
    expect(condViolations).toContain(
      'Condition cond needs true and false branches',
    );
    expect(condViolations).toContain('Condition cond needs field and equals');

    // Agent node missing config.agent_id
    const agentViolations = graphViolations(
      {
        nodes: [
          { id: 'start', type: 'start', label: 'Start' },
          { id: 'agent-step', type: 'agent', label: 'Bot', config: {} },
          { id: 'out', type: 'output', label: 'End' },
        ],
        edges: [
          { source: 'start', target: 'agent-step' },
          { source: 'agent-step', target: 'out' },
        ],
      },
      true,
    );
    expect(agentViolations).toContain(
      'Agent node agent-step needs config.agent_id',
    );

    // Knowledge search tool missing knowledge_base_id & connector tool missing UUID connection_id
    const toolViolations = graphViolations(
      {
        nodes: [
          { id: 'start', type: 'start', label: 'Start' },
          {
            id: 'kb-tool',
            type: 'tool',
            label: 'Search',
            config: { tool_key: 'knowledge.search' },
          },
          {
            id: 'conn-tool',
            type: 'tool',
            label: 'Profile',
            config: {
              tool_key: 'connector.profile.read',
              connection_id: 'not-a-uuid',
            },
          },
          { id: 'out', type: 'output', label: 'End' },
        ],
        edges: [
          { source: 'start', target: 'kb-tool' },
          { source: 'kb-tool', target: 'conn-tool' },
          { source: 'conn-tool', target: 'out' },
        ],
      },
      true,
    );
    expect(toolViolations).toContain(
      'Knowledge tool node kb-tool requires knowledge_base_id',
    );
    expect(toolViolations).toContain(
      'OAuth tool node conn-tool requires connection_id UUID',
    );
  });
});
