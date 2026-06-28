import { GraphEngine } from '../graph/GraphEngine';
describe('GraphEngine', () => {
  it('should build representation from list', () => {
    const graph = GraphEngine.buildGraph([], []);
    expect(graph.nodes.size).toBe(0);
  });
});
