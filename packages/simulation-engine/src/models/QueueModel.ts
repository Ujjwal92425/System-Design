import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class QueueModel extends NodeModel {
  type = NodeType.QUEUE;

  process(incomingQps: number, config: any): NodeResult {
    const processingRate = config?.processingRate || 3000;
    const isOverloaded = incomingQps > processingRate;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth: number;

    if (isOverloaded) {
      const overflow = incomingQps - processingRate;
      queueDepth = Math.round(overflow * 5);
      qps = processingRate;
      errorRate = Math.min(80, (overflow / incomingQps) * 100);
      latency = 50 + (overflow / processingRate) * 500;
    } else {
      const rho = incomingQps / processingRate;
      if (rho > 0) {
        const cProb = erlangC(incomingQps, processingRate / 10, 10);
        queueDepth = Math.round(cProb * incomingQps);
        latency = 2 + cProb * 20;
      } else {
        queueDepth = 0;
        latency = 2;
      }
      qps = incomingQps;
      errorRate = 0;
    }

    return {
      outgoingQps: qps,
      passthrough: 0,
      latency,
      errorRate,
      queueDepth,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { processingRate, overflow: Math.max(0, incomingQps - processingRate) },
    };
  }
}
