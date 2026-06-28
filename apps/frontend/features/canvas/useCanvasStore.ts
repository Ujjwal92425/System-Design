'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  selected?: boolean;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  animated?: boolean;
  selected?: boolean;
  type?: string;
}

interface HistoryEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  dirty: boolean;
  lastSavedAt: Date | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  hoveredNodeId: string | null;

  init: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  addNode: (node: CanvasNode) => void;
  addEdge: (edge: CanvasEdge) => void;
  deleteSelected: () => void;
  deleteNode: (nodeId: string) => void;
  duplicateSelected: () => void;
  duplicateNode: (nodeId: string) => void;
  renameNode: (nodeId: string, label: string) => void;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setHoveredNodeId: (id: string | null) => void;
}

const MAX_HISTORY = 50;

function pushHistory(past: HistoryEntry[], nodes: CanvasNode[], edges: CanvasEdge[]): HistoryEntry[] {
  const next = [...past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [],
      dirty: false,
      lastSavedAt: null,
      past: [],
      future: [],
      hoveredNodeId: null,

      init(nodes, edges) {
        set({ nodes, edges, dirty: false, past: [], future: [] });
      },

      setNodes(nodes) {
        const { nodes: prev, edges, past } = get();
        set({
          nodes,
          edges,
          dirty: true,
          past: pushHistory(past, prev, edges),
          future: [],
        });
      },

      setEdges(edges) {
        const { nodes, edges: prev, past } = get();
        set({
          edges,
          dirty: true,
          past: pushHistory(past, nodes, prev),
          future: [],
        });
      },

      addNode(node) {
        const { nodes, edges, past } = get();
        set({
          nodes: [...nodes, node],
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      addEdge(edge) {
        const { nodes, edges, past } = get();
        set({
          edges: [...edges, edge],
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      deleteSelected() {
        const { nodes, edges, past } = get();
        const selectedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
        if (selectedNodeIds.size === 0) return;

        const nextNodes = nodes.filter(n => !selectedNodeIds.has(n.id));
        const nextEdges = edges.filter(
          e => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
        );

        set({
          nodes: nextNodes,
          edges: nextEdges,
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      deleteNode(nodeId) {
        const { nodes, edges, past } = get();
        const nextNodes = nodes.filter(n => n.id !== nodeId);
        const nextEdges = edges.filter(
          e => e.source !== nodeId && e.target !== nodeId
        );

        set({
          nodes: nextNodes,
          edges: nextEdges,
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      duplicateSelected() {
        const { nodes, edges, past } = get();
        const selected = nodes.filter(n => n.selected);
        if (selected.length === 0) return;

        const duplicates: CanvasNode[] = selected.map(n => ({
          ...n,
          id: `${n.id}-copy-${Date.now()}`,
          selected: false,
          position: { x: n.position.x + 40, y: n.position.y + 40 },
          data: { ...n.data, label: `${n.data.label || ''} (copy)` },
        }));

        set({
          nodes: [...nodes.map(n => ({ ...n, selected: false })), ...duplicates],
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      duplicateNode(nodeId) {
        const { nodes, edges, past } = get();
        const source = nodes.find(n => n.id === nodeId);
        if (!source) return;

        const dup: CanvasNode = {
          ...source,
          id: `${source.id}-copy-${Date.now()}`,
          selected: false,
          position: { x: source.position.x + 40, y: source.position.y + 40 },
          data: { ...source.data, label: `${source.data.label || ''} (copy)` },
        };

        set({
          nodes: [...nodes, dup],
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      renameNode(nodeId, label) {
        const { nodes, edges, past } = get();
        set({
          nodes: nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n),
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      updateNodeData(nodeId, data) {
        const { nodes, edges, past } = get();
        set({
          nodes: nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: [],
        });
      },

      undo() {
        const { nodes, edges, past, future } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        set({
          nodes: JSON.parse(JSON.stringify(previous.nodes)),
          edges: JSON.parse(JSON.stringify(previous.edges)),
          dirty: true,
          past: past.slice(0, -1),
          future: [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...future],
        });
      },

      redo() {
        const { nodes, edges, past, future } = get();
        if (future.length === 0) return;

        const next = future[0];
        set({
          nodes: JSON.parse(JSON.stringify(next.nodes)),
          edges: JSON.parse(JSON.stringify(next.edges)),
          dirty: true,
          past: pushHistory(past, nodes, edges),
          future: future.slice(1),
        });
      },

      markSaved() {
        set({ dirty: false, lastSavedAt: new Date() });
      },
      setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
    }),
    { name: 'CanvasStore' }
  )
);
