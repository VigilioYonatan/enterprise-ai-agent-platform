import { describe, expect, it } from 'vitest';
import { parseGraphJson } from './workflow-json';

describe('structured graph editor validation', () => {
  it('accepts empty and valid connected graphs with config and positions', () => {
    expect(parseGraphJson('{"nodes":[],"edges":[]}')).toEqual({
      nodes: [],
      edges: [],
    });
    const graph = parseGraphJson(
      JSON.stringify({
        nodes: [
          {
            id: 'start',
            type: 'start',
            label: 'Start',
            position: { x: 40, y: 120 },
          },
          {
            id: 'out',
            type: 'output',
            label: 'End',
            config: { summary: true },
          },
        ],
        edges: [{ source: 'start', target: 'out', when: 'true' }],
      }),
    );
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0]?.position).toEqual({ x: 40, y: 120 });
    expect(graph.edges[0]?.when).toBe('true');
  });

  it('rejects malformed JSON, non-object roots, and invalid node/edge shapes', () => {
    expect(() => parseGraphJson('[]')).toThrow('Graph must be a JSON object');
    expect(() => parseGraphJson('{"nodes":3,"edges":[]}')).toThrow();
    expect(() =>
      parseGraphJson(
        '{"nodes":[{"id":"n1","type":"shell","label":"Bad"}],"edges":[]}',
      ),
    ).toThrow('invalid workflow node type');
    expect(() =>
      parseGraphJson(
        '{"nodes":[{"id":"n1","type":"start","label":"S","position":{"x":"bad","y":0}}],"edges":[]}',
      ),
    ).toThrow('must contain finite x and y');
    expect(() =>
      parseGraphJson(
        '{"nodes":[{"id":"","type":"start","label":"S"}],"edges":[]}',
      ),
    ).toThrow('must be 1..64 chars');
    expect(() =>
      parseGraphJson(
        '{"nodes":[{"id":"n1","type":"start","label":""}],"edges":[]}',
      ),
    ).toThrow('must be 1..120 chars');
    expect(() =>
      parseGraphJson(
        '{"nodes":[{"id":"n1","type":"start","label":"S","config":"bad"}],"edges":[]}',
      ),
    ).toThrow('must be an object');
    expect(() => parseGraphJson('{"nodes":[123],"edges":[]}')).toThrow(
      'must be an object',
    );
    expect(() => parseGraphJson('{"nodes":[],"edges":[null]}')).toThrow(
      'must be an object',
    );
    expect(() =>
      parseGraphJson('{"nodes":[],"edges":[{"source":"","target":"b"}]}'),
    ).toThrow('must be 1..64 chars');
    expect(() =>
      parseGraphJson('{"nodes":[],"edges":[{"source":"a","target":""}]}'),
    ).toThrow('must be 1..64 chars');
    expect(() =>
      parseGraphJson(
        '{"nodes":[],"edges":[{"source":"a","target":"b","when":"maybe"}]}',
      ),
    ).toThrow('must be "true" or "false"');
    expect(() =>
      parseGraphJson(
        JSON.stringify({
          nodes: Array.from({ length: 105 }, (_, i) => ({
            id: `n${i}`,
            type: 'start',
            label: `N${i}`,
          })),
          edges: [],
        }),
      ),
    ).toThrow('exceeds maximum node or edge limits');
  });
});
