import { SimGraph } from './GraphEngine';

const PROTOCOL_LATENCY_MS: Record<string, number> = {
  'HTTP': 5,
  'HTTPS': 5,
  'gRPC': 2,
  'TCP': 1,
  'UDP': 0.5,
  'Kafka': 3,
  'Redis': 0.5,
  'WebSocket': 3,
};

export class GraphTraversal {
  static getAdjacencyList(graph: SimGraph): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const edge of graph.edges) {
      if (!adj.has(edge.source)) {
        adj.set(edge.source, []);
      }
      adj.get(edge.source)!.push(edge.target);
    }
    return adj;
  }

  static getEdgeLatency(source: string, target: string, graph: SimGraph): number {
    for (const edge of graph.edges) {
      if (edge.source === source && edge.target === target) {
        const proto = edge.label || 'HTTP';
        return PROTOCOL_LATENCY_MS[proto] ?? 5;
      }
    }
    return PROTOCOL_LATENCY_MS['HTTP'];
  }
}
