/**
 * apps/frontend/features/canvas/useCanvasStore.ts
 *
 * Zustand store for the Build canvas.
 *
 * Responsibilities:
 *  - Holds the live nodes[] and edges[] arrays (ReactFlow state)
 *  - Maintains a 50-entry undo/redo history stack
 *  - Tracks a `dirty` flag (unsaved changes) for the auto-save system
 *  - Provides keyboard shortcut actions: undo, redo, deleteSelected, duplicate
 *
 * History strategy:
 *  - Every time nodes or edges change via setNodes/setEdges, a snapshot
 *    is pushed onto `past[]`. Undo pops past → present → future.
 *  - History is capped at MAX_HISTORY entries to bound memory usage.
 */

'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Lightweight ReactFlow-compatible node shape for the store */
export interface CanvasNode {
  id:       string;
  type:     string;
  position: { x: number; y: number };
  data:     Record<string, any>;
  selected?: boolean;
}

/** Lightweight ReactFlow-compatible edge shape */
export interface CanvasEdge {
  id:             string;
  source:         string;
  target:         string;
  sourceHandle?:  string | null;
  targetHandle?:  string | null;
  label?:         string;
  animated?:      boolean;
  selected?:      boolean;
}

interface HistoryEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface CanvasState {
  // ── Canvas data ──────────────────────────────────────────────────────────
  nodes: CanvasNode[];
  edges: CanvasEdge[];

  // ── Dirty / unsaved tracking ─────────────────────────────────────────────
  dirty: boolean;        // true when canvas has unsaved changes
  lastSavedAt: Date | null;

  // ── Undo / redo history ──────────────────────────────────────────────────
  past:   HistoryEntry[];
  future: HistoryEntry[];

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Initialize the store from a loaded design version */
  init:          (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  setNodes:      (nodes: CanvasNode[]) => void;
  setEdges:      (edges: CanvasEdge[]) => void;
  addNode:       (node: CanvasNode) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  undo:          () => void;
  redo:          () => void;
  markSaved:     () => void;
}

const MAX_HISTORY = 50;

/** Push current state onto the past stack before a mutation */
function pushHistory(past: HistoryEntry[], nodes: CanvasNode[], edges: CanvasEdge[]): HistoryEntry[] {
  const next = [...past, { nodes, edges }];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

// ─────────────────────────────────────────────────────────────────────────────
export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      nodes:       [],
      edges:       [],
      dirty:       false,
      lastSavedAt: null,
      past:        [],
      future:      [],

      /**
       * Initialize canvas from a saved version.
       * Clears history so the user can't "undo" to an empty canvas on first load.
       */
      init(nodes, edges) {
        set({ nodes, edges, dirty: false, past: [], future: [] });
      },

      /** Replace nodes array (e.g. after drag/drop from ReactFlow onNodesChange) */
      setNodes(nodes) {
        const { nodes: prev, edges, past } = get();
        set({
          nodes,
          edges,
          dirty:  true,
          past:   pushHistory(past, prev, edges),
          future: [], // clear redo stack on new action
        });
      },

      /** Replace edges array (e.g. after connection from ReactFlow onEdgesChange) */
      setEdges(edges) {
        const { nodes, edges: prev, past } = get();
        set({
          edges,
          dirty:  true,
          past:   pushHistory(past, nodes, prev),
          future: [],
        });
      },

      /** Add a single new node (from the toolbar drag-in or double-click) */
      addNode(node) {
        const { nodes, edges, past } = get();
        set({
          nodes:  [...nodes, node],
          dirty:  true,
          past:   pushHistory(past, nodes, edges),
          future: [],
        });
      },

      /** Delete all currently selected nodes and their connected edges */
      deleteSelected() {
        const { nodes, edges, past } = get();
        const selectedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
        if (selectedNodeIds.size === 0) return;

        const nextNodes = nodes.filter(n => !selectedNodeIds.has(n.id));
        // Also remove edges connected to deleted nodes
        const nextEdges = edges.filter(
          e => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
        );

        set({
          nodes:  nextNodes,
          edges:  nextEdges,
          dirty:  true,
          past:   pushHistory(past, nodes, edges),
          future: [],
        });
      },

      /** Duplicate selected nodes with a small position offset */
      duplicateSelected() {
        const { nodes, edges, past } = get();
        const selected = nodes.filter(n => n.selected);
        if (selected.length === 0) return;

        const duplicates: CanvasNode[] = selected.map(n => ({
          ...n,
          id:       `${n.id}-copy-${Date.now()}`,
          selected: false,
          position: { x: n.position.x + 40, y: n.position.y + 40 },
          data:     { ...n.data },
        }));

        set({
          nodes:  [...nodes.map(n => ({ ...n, selected: false })), ...duplicates],
          dirty:  true,
          past:   pushHistory(past, nodes, edges),
          future: [],
        });
      },

      /** Undo last action — pops from past, pushes current to future */
      undo() {
        const { nodes, edges, past, future } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        set({
          nodes:  previous.nodes,
          edges:  previous.edges,
          dirty:  true,
          past:   past.slice(0, -1),
          future: [{ nodes, edges }, ...future],
        });
      },

      /** Redo — pops from future, pushes current to past */
      redo() {
        const { nodes, edges, past, future } = get();
        if (future.length === 0) return;

        const next = future[0];
        set({
          nodes:  next.nodes,
          edges:  next.edges,
          dirty:  true,
          past:   pushHistory(past, nodes, edges),
          future: future.slice(1),
        });
      },

      /** Called by auto-save after a successful API save */
      markSaved() {
        set({ dirty: false, lastSavedAt: new Date() });
      },
    }),
    { name: 'CanvasStore' }
  )
);
