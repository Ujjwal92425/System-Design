import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class ApiGatewayModel extends NodeModel {
  type = NodeType.API_GATEWAY;

  process(incomingQps: number, config: any): NodeResult {
    const rateLimit = config?.rateLimitQps || 10000;
    const threadPoolSize = config?.threadPoolSize || 100;
    const isRateLimited = incomingQps > rateLimit;

    let qps: number;
    let latency: number;
    let errorRate: number;

    if (isRateLimited) {
      const dropped = incomingQps - rateLimit;
      qps = rateLimit;
      errorRate = Math.min(95, (dropped / incomingQps) * 100);
      latency = 10 + (dropped / 50);
    } else {
      const rho = incomingQps / rateLimit;
      if (rho > 0.5) {
        const cProb = erlangC(incomingQps, 100, threadPoolSize);
        latency = 5 + cProb * 15;
      } else {
        latency = 5;
      }
      qps = incomingQps;
      errorRate = 0;
    }

    return {
      outgoingQps: qps,
      passthrough: qps,
      latency,
      errorRate,
      queueDepth: Math.max(0, incomingQps - qps),
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { rateLimit, threadPoolSize, utilizationPct: Math.min(100, (incomingQps / rateLimit) * 100) },
    };
  }
}
