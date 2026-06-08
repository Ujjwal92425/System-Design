import { create } from 'zustand';
import { DesignNode, DesignEdge, NodeType } from '@sd-os/shared';

interface CanvasState {
  nodes: DesignNode[];
  edges: DesignEdge[];
  isDirty: boolean;
  addNode: (type: NodeType, x: number, y: number) => void;
  addEdge: (edge: DesignEdge) => void;
  loadDesign: (nodes: DesignNode[], edges: DesignEdge[]) => void;
  markClean: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  isDirty: false,
  
  addNode: (type, x, y) => set((state) => {
    const newNode: DesignNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x, y },
      data: { label: type.replace('_', ' ') }
    };
    return {
      nodes: [...state.nodes, newNode],
      isDirty: true
    };
  }),

  addEdge: (edge) => set((state) => ({
    edges: [...state.edges, edge],
    isDirty: true
  })),

  loadDesign: (nodes, edges) => set({
    nodes,
    edges,
    isDirty: false
  }),

  markClean: () => set({ isDirty: false })
}));
