import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class RateLimiterModel extends NodeModel {
  type = NodeType.RATE_LIMITER;

  process(incomingQps: number, config: any): NodeResult {
    const limit = config?.rateLimitQps || 2000;
    const isRateLimited = incomingQps > limit;

    if (isRateLimited) {
      const dropped = incomingQps - limit;
      return {
        outgoingQps: limit,
        passthrough: limit,
        latency: 2,
        errorRate: Math.min(90, (dropped / incomingQps) * 100),
        queueDepth: 0,
        cacheHitRate: 0,
        readReplicasUsed: 0,
        metrics: { rateLimit: limit, droppedPct: Math.round((dropped / incomingQps) * 100) },
      };
    }

    return {
      outgoingQps: incomingQps,
      passthrough: incomingQps,
      latency: 1,
      errorRate: 0,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { rateLimit: limit, droppedPct: 0 },
    };
  }
}
