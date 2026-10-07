import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from '@enterprise-agents/contracts';
import type { Edge, Node } from '@xyflow/react';

export type CanvasData = {
  label: WorkflowNode['label'];
  workflow_type: WorkflowNode['type'];
  config: Record<string, unknown>;
  [key: string]: unknown;
};

export type CanvasNode = Node<CanvasData>;
export type CanvasEdge = Edge<{ when?: WorkflowEdge['when'] }>;

export interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  onGraphChange: (next: WorkflowGraph) => void;
}
