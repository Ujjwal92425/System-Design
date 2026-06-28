import { DesignNode, DesignEdge } from '@sd-os/shared';

export interface SimGraph {
  nodes: Map<string, DesignNode>;
  edges: DesignEdge[];
}

export class GraphEngine {
  static buildGraph(nodes: DesignNode[], edges: DesignEdge[]): SimGraph {
    const nodeMap = new Map<string, DesignNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));
    return {
      nodes: nodeMap,
      edges
    };
  }
}
