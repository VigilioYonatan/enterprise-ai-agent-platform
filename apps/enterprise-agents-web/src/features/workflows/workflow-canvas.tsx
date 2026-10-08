import type { WorkflowGraph, WorkflowNode } from '@enterprise-agents/contracts';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  type EdgeChange,
  MiniMap,
  type NodeChange,
  ReactFlow,
} from '@xyflow/react';
import { useState } from 'react';
import { WORKFLOW_NODE_PALETTE } from './constants/workflows.constants';
import type {
  CanvasData,
  CanvasEdge,
  CanvasNode,
  WorkflowCanvasProps,
} from './types/workflow-canvas.type';

function serializeGraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): WorkflowGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.workflow_type,
      label: node.data.label,
      config: node.data.config,
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      ...(edge.data?.when ? { when: edge.data.when } : {}),
    })),
  };
}

export function WorkflowCanvas({ graph, onGraphChange }: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>(() =>
    graph.nodes.map((node, index) => ({
      id: node.id,
      type: 'default',
      position: node.position ?? {
        x: 120 + (index % 3) * 240,
        y: 80 + Math.floor(index / 3) * 120,
      },
      data: {
        label: node.label,
        workflow_type: node.type,
        config: node.config ?? {},
      },
    })),
  );
  const [edges, setEdges] = useState<CanvasEdge[]>(() =>
    graph.edges.map((edge, index) => ({
      id: `edge-${index}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      data: { when: edge.when },
      label: edge.when ?? '',
    })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [selected_edge, set_selected_edge] = useState<string | null>(null);
  const [config_json, set_config_json] = useState('{}');
  const [config_error, set_config_error] = useState('');

  const chosen = nodes.find((node) => node.id === selected);
  const chosen_edge = edges.find((edge) => edge.id === selected_edge);

  function select_node_by_id(node_id: string) {
    const target = nodes.find((node) => node.id === node_id);
    if (!target) return;
    setSelected(target.id);
    set_selected_edge(null);
    set_config_json(JSON.stringify(target.data.config ?? {}, null, 2));
    set_config_error('');
  }

  function handleNodesChange(changes: NodeChange<CanvasNode>[]) {
    const next_nodes = applyNodeChanges(changes, nodes);
    setNodes(next_nodes);
    // Ignore automatic ReactFlow dimension/selection internal events so mounting never marks graph dirty.
    const is_user_mutation = changes.some(
      (change) =>
        change.type === 'remove' ||
        (change.type === 'position' && change.dragging === false),
    );
    if (is_user_mutation) {
      onGraphChange(serializeGraph(next_nodes, edges));
    }
  }

  function handleEdgesChange(changes: EdgeChange<CanvasEdge>[]) {
    const next_edges = applyEdgeChanges(changes, edges);
    setEdges(next_edges);
    if (changes.some((change) => change.type === 'remove')) {
      onGraphChange(serializeGraph(nodes, next_edges));
    }
  }

  function addNode(type: WorkflowNode['type']) {
    const id = crypto.randomUUID();
    const next_nodes: CanvasNode[] = [
      ...nodes,
      {
        id,
        type: 'default',
        position: {
          x: 70 + (nodes.length % 4) * 185,
          y: 70 + Math.floor(nodes.length / 4) * 100,
        },
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          workflow_type: type,
          config: {},
        },
      },
    ];
    setNodes(next_nodes);
    onGraphChange(serializeGraph(next_nodes, edges));
  }

  function updateSelected(changes: Partial<CanvasData>) {
    const next_nodes = nodes.map((node) =>
      node.id === selected
        ? { ...node, data: { ...node.data, ...changes } }
        : node,
    );
    setNodes(next_nodes);
    onGraphChange(serializeGraph(next_nodes, edges));
  }

  function removeSelected() {
    if (selected) {
      const next_nodes = nodes.filter((node) => node.id !== selected);
      const next_edges = edges.filter(
        (edge) => edge.source !== selected && edge.target !== selected,
      );
      setNodes(next_nodes);
      setEdges(next_edges);
      setSelected(null);
      onGraphChange(serializeGraph(next_nodes, next_edges));
    }
    if (selected_edge) {
      const next_edges = edges.filter((edge) => edge.id !== selected_edge);
      setEdges(next_edges);
      set_selected_edge(null);
      onGraphChange(serializeGraph(nodes, next_edges));
    }
  }

  return (
    <section
      className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_280px]"
      aria-label="Visual workflow editor"
    >
      <aside className="rounded-lg border border-border-ui bg-surface p-3">
        <h2 className="text-sm font-bold">Node palette</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          Add steps, then connect the node handles.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {WORKFLOW_NODE_PALETTE.map((nodeType) => (
            <button
              key={nodeType}
              type="button"
              className="btn btn-secondary justify-start capitalize"
              onClick={() => addNode(nodeType)}
            >
              + {nodeType}
            </button>
          ))}
        </div>
        {nodes.length > 0 && (
          <div className="mt-5 border-t border-border-ui pt-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
              Nodes (keyboard)
            </h3>
            <ul className="mt-2 space-y-1">
              {nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => select_node_by_id(node.id)}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                      selected === node.id
                        ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100'
                        : 'hover:bg-surface-muted'
                    }`}
                  >
                    {node.data.label} ({node.data.workflow_type})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section
        aria-label="Workflow canvas"
        className="h-[540px] min-w-0 overflow-hidden rounded-lg border border-border-ui bg-white dark:bg-slate-950"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={(connection: Connection) => {
            const next_edges = addEdge(connection, edges);
            setEdges(next_edges);
            onGraphChange(serializeGraph(nodes, next_edges));
          }}
          onNodeClick={(_event: React.MouseEvent, node: CanvasNode) =>
            select_node_by_id(node.id)
          }
          onEdgeClick={(_event: React.MouseEvent, edge: CanvasEdge) => {
            set_selected_edge(edge.id);
            setSelected(null);
          }}
          fitView
          nodesDraggable
          nodesConnectable
        >
          <Background />
          <Controls />
          <MiniMap zoomable pannable />
        </ReactFlow>
      </section>

      <aside className="rounded-lg border border-border-ui bg-surface p-3">
        <h2 className="font-bold">Inspector</h2>
        {chosen ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-foreground-muted">
              {chosen.data.workflow_type} · {chosen.id.slice(0, 8)}
            </p>
            <label className="block text-sm">
              Label
              <input
                className="field"
                value={chosen.data.label}
                onChange={(event) =>
                  updateSelected({ label: event.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              Config JSON
              <textarea
                className="field font-mono text-xs"
                rows={8}
                value={config_json}
                onChange={(event) => {
                  set_config_json(event.target.value);
                  try {
                    const value: unknown = JSON.parse(event.target.value);
                    if (
                      value &&
                      typeof value === 'object' &&
                      !Array.isArray(value)
                    ) {
                      updateSelected({
                        config: value as Record<string, unknown>,
                      });
                      set_config_error('');
                    } else {
                      set_config_error('Config must be an object');
                    }
                  } catch {
                    set_config_error('Invalid JSON');
                  }
                }}
              />
            </label>
            {config_error && (
              <p role="alert" className="text-xs text-red-700">
                {config_error}
              </p>
            )}
            <p className="text-xs text-foreground-muted">
              Agent: config.agent_id. Tool: config.tool_key (knowledge.search
              needs knowledge_base_id; connector.profile.read needs
              connection_id) and requires_approval. Condition: field and equals.
            </p>
            <button
              type="button"
              className="btn btn-danger"
              onClick={removeSelected}
            >
              Remove node
            </button>
          </div>
        ) : chosen_edge ? (
          <div className="mt-3">
            <label className="block text-sm">
              Branch condition
              <select
                className="field"
                value={chosen_edge.data?.when ?? ''}
                onChange={(event) => {
                  const when_value: 'true' | 'false' | undefined =
                    event.target.value === 'true' ||
                    event.target.value === 'false'
                      ? event.target.value
                      : undefined;
                  const next_edges = edges.map((edge) =>
                    edge.id === selected_edge
                      ? {
                          ...edge,
                          data: { when: when_value },
                          label: event.target.value,
                        }
                      : edge,
                  );
                  setEdges(next_edges);
                  onGraphChange(serializeGraph(nodes, next_edges));
                }}
              >
                <option value="">Unconditional</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn-danger mt-3"
              onClick={removeSelected}
            >
              Remove edge
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground-muted">
            Select a node or edge to edit. A structured JSON alternative is also
            available.
          </p>
        )}
      </aside>
    </section>
  );
}
