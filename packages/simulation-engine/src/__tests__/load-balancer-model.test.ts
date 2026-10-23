import { LoadBalancerModel } from '../models/LoadBalancerModel';
describe('LoadBalancerModel', () => {
  it('should distribute requests within capacity limits', () => {
    const model = new LoadBalancerModel();
    const res = model.process(100, {});
    expect(res.errorRate).toBe(0);
  });
});
