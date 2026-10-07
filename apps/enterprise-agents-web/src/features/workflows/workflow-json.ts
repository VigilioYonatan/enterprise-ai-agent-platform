import type { WorkflowGraph, WorkflowNode } from '@enterprise-agents/contracts';

const MAX_GRAPH_NODES = 100;
const MAX_GRAPH_EDGES = 200;
const MAX_NODE_ID_LENGTH = 64;
const MAX_NODE_LABEL_LENGTH = 120;

const VALID_NODE_TYPES = new Set<WorkflowNode['type']>([
  'start',
  'agent',
  'condition',
  'tool',
  'approval',
  'output',
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseGraphJson(raw: string): WorkflowGraph {
  const object: unknown = JSON.parse(raw);
  if (!isPlainRecord(object)) {
    throw new Error('Graph must be a JSON object');
  }
  if (!Array.isArray(object.nodes) || !Array.isArray(object.edges)) {
    throw new Error('Graph must contain nodes and edges arrays');
  }
  if (
    object.nodes.length > MAX_GRAPH_NODES ||
    object.edges.length > MAX_GRAPH_EDGES
  ) {
    throw new Error('Graph exceeds maximum node or edge limits');
  }

  const nodes: WorkflowGraph['nodes'] = object.nodes.map((item, index) => {
    if (!isPlainRecord(item)) {
      throw new Error(`nodes.${index}: must be an object`);
    }
    const { id, type, label, config, position } = item;
    if (
      typeof id !== 'string' ||
      id.length < 1 ||
      id.length > MAX_NODE_ID_LENGTH
    ) {
      throw new Error(`nodes.${index}.id: must be 1..64 chars`);
    }
    if (
      typeof type !== 'string' ||
      !VALID_NODE_TYPES.has(type as WorkflowNode['type'])
    ) {
      throw new Error(`nodes.${index}.type: invalid workflow node type`);
    }
    if (
      typeof label !== 'string' ||
      label.length < 1 ||
      label.length > MAX_NODE_LABEL_LENGTH
    ) {
      throw new Error(`nodes.${index}.label: must be 1..120 chars`);
    }
    if (config !== undefined && !isPlainRecord(config)) {
      throw new Error(`nodes.${index}.config: must be an object`);
    }
    let validated_position: { x: number; y: number } | undefined;
    if (position !== undefined) {
      if (
        !isPlainRecord(position) ||
        typeof position.x !== 'number' ||
        !Number.isFinite(position.x) ||
        typeof position.y !== 'number' ||
        !Number.isFinite(position.y)
      ) {
        throw new Error(`nodes.${index}.position: must contain finite x and y`);
      }
      validated_position = { x: position.x, y: position.y };
    }
    return {
      id,
      type: type as WorkflowNode['type'],
      label,
      ...(config !== undefined ? { config } : {}),
      ...(validated_position !== undefined
        ? { position: validated_position }
        : {}),
    };
  });

  const edges: WorkflowGraph['edges'] = object.edges.map((item, index) => {
    if (!isPlainRecord(item)) {
      throw new Error(`edges.${index}: must be an object`);
    }
    const { source, target, when } = item;
    if (
      typeof source !== 'string' ||
      source.length < 1 ||
      source.length > MAX_NODE_ID_LENGTH
    ) {
      throw new Error(`edges.${index}.source: must be 1..64 chars`);
    }
    if (
      typeof target !== 'string' ||
      target.length < 1 ||
      target.length > MAX_NODE_ID_LENGTH
    ) {
      throw new Error(`edges.${index}.target: must be 1..64 chars`);
    }
    if (when !== undefined && when !== 'true' && when !== 'false') {
      throw new Error(`edges.${index}.when: must be "true" or "false"`);
    }
    return {
      source,
      target,
      ...(when !== undefined ? { when } : {}),
    };
  });

  return { nodes, edges };
}
