import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class LoadBalancerModel extends NodeModel {
  type = NodeType.LOAD_BALANCER;

  process(incomingQps: number, config: any): NodeResult {
    const capacity = config?.capacity || 10000;
    const algorithm = config?.routingAlgorithm || 'round_robin';
    const upstreamCount = Math.max(1, config?.upstreamCount || 3);
    const isOverloaded = incomingQps > capacity;

    let qps = incomingQps;
    let latency: number;
    let errorRate: number;

    if (isOverloaded) {
      const excess = incomingQps - capacity;
      errorRate = Math.min(95, (excess / incomingQps) * 100);
      qps = capacity;
      latency = 5 + (excess / 100);
    } else {
      errorRate = 0;
      const perUpstream = incomingQps / upstreamCount;
      let waitTime = 0;
      if (perUpstream > 0) {
        const mu = 500;
        waitTime = erlangC(perUpstream, mu, 1) * mu / (mu - perUpstream);
      }
      latency = (algorithm === 'least_connections' ? 1 : 2) + Math.min(waitTime, 20);
    }

    return {
      outgoingQps: qps,
      passthrough: qps,
      latency,
      errorRate,
      queueDepth: Math.max(0, incomingQps - qps),
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { algorithm, utilizationPct: Math.min(100, (incomingQps / capacity) * 100) },
    };
  }
}
