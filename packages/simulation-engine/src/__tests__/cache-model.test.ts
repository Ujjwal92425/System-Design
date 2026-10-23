import { CacheModel } from '../models/CacheModel';

describe('CacheModel', () => {
  it('should emit correct hit rates', () => {
    const model = new CacheModel();
    const result = model.process(1000, { hitRate: 0.85, ttlSeconds: 3600, evictionPolicy: 'lru' });
    expect(result.cacheHitRate).toBeCloseTo(0.83, 1);
    expect(result.errorRate).toBe(0);
    expect(result.latency).toBeLessThan(10);
  });

  it('should degrade with short TTL', () => {
    const model = new CacheModel();
    const result = model.process(1000, { hitRate: 0.85, ttlSeconds: 30, evictionPolicy: 'lru' });
    expect(result.cacheHitRate).toBeLessThan(0.85);
  });
});
