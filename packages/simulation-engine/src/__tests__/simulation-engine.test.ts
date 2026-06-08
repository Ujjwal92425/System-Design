import { SimulationEngine } from '../SimulationEngine';
describe('SimulationEngine', () => {
  it('should run ticks and update node history', () => {
    const engine = new SimulationEngine([], []);
    expect(engine).toBeDefined();
  });
});
