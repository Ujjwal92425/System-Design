import { QueueModel } from '../models/QueueModel';
describe('QueueModel', () => {
  it('should process queue throughput', () => {
    const model = new QueueModel();
    const res = model.process(100, {});
    expect(res.outgoingQps).toBeLessThanOrEqual(100);
  });
});
