import { DatabaseModel } from '../models/DatabaseModel';

describe('DatabaseModel', () => {
  it('should handle db load and report errors on overload', () => {
    const model = new DatabaseModel();
    const res = model.process(3000, { capacity: 2000, latency: 20 });
    expect(res.errorRate).toBeGreaterThan(0);
  });
});
