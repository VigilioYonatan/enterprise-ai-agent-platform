import { z } from 'zod';
import { TOOL_CONSTANTS } from '../../../tools/constants/tools.constants';
import { WORKFLOW_CONSTANTS } from '../../constants/workflows.constants';

export const nodeSchema = z
  .object({
    id: z.string().min(1).max(WORKFLOW_CONSTANTS.MAX_NODE_ID_LENGTH),
    type: z.enum(WORKFLOW_CONSTANTS.NODE_TYPES),
    label: z.string().min(1).max(WORKFLOW_CONSTANTS.MAX_NODE_LABEL_LENGTH),
    position: z
      .object({ x: z.number().finite(), y: z.number().finite() })
      .optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const edgeSchema = z
  .object({
    source: z.string().min(1).max(WORKFLOW_CONSTANTS.MAX_NODE_ID_LENGTH),
    target: z.string().min(1).max(WORKFLOW_CONSTANTS.MAX_NODE_ID_LENGTH),
    when: z.enum(WORKFLOW_CONSTANTS.EDGE_BRANCHES).optional(),
  })
  .strict();

export const graphSchema = z
  .object({
    nodes: z.array(nodeSchema).min(0).max(WORKFLOW_CONSTANTS.MAX_NODES),
    edges: z.array(edgeSchema).max(WORKFLOW_CONSTANTS.MAX_EDGES),
  })
  .strict();

export type WorkflowGraph = z.output<typeof graphSchema>;
export type WorkflowNode = WorkflowGraph['nodes'][number];
export type WorkflowEdge = WorkflowGraph['edges'][number];

export const workflowSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(
      WORKFLOW_CONSTANTS.MIN_NAME_LENGTH,
      'Workflow name must have at least 2 characters',
    )
    .max(WORKFLOW_CONSTANTS.MAX_NAME_LENGTH),
  graph: graphSchema,
  status: z.enum(WORKFLOW_CONSTANTS.STATUSES),
  revision: z.number().int().positive(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type WorkflowSchema = z.infer<typeof workflowSchema>;

export const workflowVersionSchema = z.object({
  id: z.uuid(),
  workflow_id: z.uuid(),
  version: z.number().int().positive(),
  graph: graphSchema,
  created_at: z.date(),
});

export type WorkflowVersionSchema = z.infer<typeof workflowVersionSchema>;

export function graphViolations(
  graph: WorkflowGraph,
  require_published = false,
): string[] {
  const ids = graph.nodes.map((n) => n.id),
    set = new Set(ids),
    failures: string[] = [];
  if (ids.length !== set.size) failures.push('Duplicate node identifiers');
  const starts = graph.nodes.filter((n) => n.type === 'start');
  if (starts.length !== 1 && (require_published || graph.nodes.length > 0))
    failures.push('Exactly one start node is required');
  if (require_published && !graph.nodes.some((n) => n.type === 'output'))
    failures.push('At least one output node is required');
  for (const edge of graph.edges) {
    if (!set.has(edge.source) || !set.has(edge.target))
      failures.push('Edges must connect existing nodes');
    if (edge.source === edge.target)
      failures.push('Self-edges are not allowed');
  }
  const adjacency = new Map(ids.map((id) => [id, [] as string[]]));
  for (const edge of graph.edges)
    if (set.has(edge.source) && set.has(edge.target))
      adjacency.get(edge.source)?.push(edge.target);
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  if (ids.some(visit)) failures.push('Cycles are not allowed');
  if (starts.length === 1) {
    const reached = new Set<string>(),
      stack = [starts[0].id];
    while (stack.length) {
      const id = stack.pop();
      if (!id || reached.has(id)) continue;
      reached.add(id);
      stack.push(...(adjacency.get(id) ?? []));
    }
    if (graph.nodes.some((n) => !reached.has(n.id)))
      failures.push('All nodes must be reachable from start');
  }
  for (const node of graph.nodes) {
    const outgoing = graph.edges.filter((e) => e.source === node.id);
    if (require_published) {
      if (node.type === 'output' && outgoing.length)
        failures.push(`Output node ${node.id} must be terminal`);
      if (
        node.type === 'tool' &&
        node.config?.tool_key === 'knowledge.search' &&
        typeof node.config?.knowledge_base_id !== 'string'
      )
        failures.push(
          `Knowledge tool node ${node.id} requires knowledge_base_id`,
        );
      if (
        node.type === 'tool' &&
        node.config?.tool_key === 'connector.profile.read' &&
        !z.uuid().safeParse(node.config?.connection_id).success
      )
        failures.push(`OAuth tool node ${node.id} requires connection_id UUID`);
      if (node.type === 'condition') {
        if (
          outgoing.length !== 2 ||
          new Set(outgoing.map((e) => e.when)).size !== 2 ||
          outgoing.some((e) => !e.when)
        )
          failures.push(`Condition ${node.id} needs true and false branches`);
      } else if (node.type !== 'output' && outgoing.length !== 1)
        failures.push(`Node ${node.id} requires exactly one outgoing edge`);
    }
    if (node.type === 'agent' && typeof node.config?.agent_id !== 'string')
      failures.push(`Agent node ${node.id} needs config.agent_id`);
    if (
      node.type === 'tool' &&
      !(TOOL_CONSTANTS.KEYS as readonly string[]).includes(
        String(node.config?.tool_key ?? ''),
      )
    )
      failures.push(`Tool node ${node.id} must use an allowlisted tool_key`);
    if (
      node.type === 'condition' &&
      (typeof node.config?.field !== 'string' ||
        !Object.hasOwn(node.config ?? {}, 'equals'))
    )
      failures.push(`Condition ${node.id} needs field and equals`);
  }
  return [...new Set(failures)];
}
