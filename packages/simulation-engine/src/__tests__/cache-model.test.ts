import { CacheModel } from '../models/CacheModel';

describe('CacheModel', () => {
  it('should process cache hits/misses based on config', () => {
    const model = new CacheModel();
    const res = model.process(100, { hitRate: 0.9, hitLatencyMs: 1 });
    expect(res.passthrough).toBeCloseTo(10);
    expect(res.latency).toBe(1);
  });
});
