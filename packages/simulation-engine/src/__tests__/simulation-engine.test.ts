import { SimulationEngine } from '../SimulationEngine';

describe('SimulationEngine', () => {
  it('should construct with config', () => {
    const engine = new SimulationEngine([], [], {
      targetQps: 1000,
      pattern: 'CONSTANT',
    });
    expect(engine).toBeDefined();
  });

  it('should run ticks and produce metrics', (done) => {
    const engine = new SimulationEngine(
      [
        { id: 'lb-1', type: 'LOAD_BALANCER', data: { label: 'LB' } },
        { id: 'web-1', type: 'WEB_SERVER', data: { label: 'Web', threadPoolSize: 200 } },
      ],
      [
        { id: 'e1', source: 'lb-1', target: 'web-1' },
      ],
      { targetQps: 5000, pattern: 'CONSTANT' },
    );

    engine.start((tick) => {
      expect(tick.tick).toBeGreaterThan(0);
      expect(tick.nodes).toHaveLength(2);
      expect(tick.systemHealth).toBeDefined();
      engine.stop();
      done();
    });
  });

  it('should handle chaos injection', () => {
    const engine = new SimulationEngine(
      [{ id: 'svc', type: 'MICROSERVICE', data: {} }],
      [],
      { targetQps: 1000, pattern: 'CONSTANT' },
    );

    const event = engine.injectChaos('svc', 'KILL', 0);
    expect(event.mode).toBe('KILL');
    expect(event.nodeId).toBe('svc');

    engine.healChaos('svc');
  });

  it('should stop and return history', (done) => {
    const engine = new SimulationEngine([], [], { targetQps: 500, pattern: 'CONSTANT' });

    engine.start(() => {
      const history = engine.stop();
      expect(Array.isArray(history)).toBe(true);
      done();
    });
  });
});
