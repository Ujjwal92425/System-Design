import { SimGraph } from './GraphEngine';

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
}
