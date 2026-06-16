import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

const EVICTION_PENALTIES: Record<string, number> = {
  lru: 0.02,
  lfu: 0.01,
  fifo: 0.05,
  ttl: 0.03,
};

export class CacheModel extends NodeModel {
  type = NodeType.CACHE;

  process(incomingQps: number, config: any): NodeResult {
    const hitRateBase = config?.hitRate || 0.85;
    const ttlSeconds = config?.ttlSeconds ?? 3600;
    const evictionPolicy = config?.evictionPolicy || 'lru';

    const penalty = EVICTION_PENALTIES[evictionPolicy] || 0.03;
    const capacity = config?.capacity || 25000;
    const usageRatio = Math.min(1, incomingQps / capacity);
    const evictionDegradation = penalty * usageRatio;
    const ttlMissPenalty = ttlSeconds < 60 ? 0.15 : ttlSeconds < 300 ? 0.08 : 0;
    const hitRate = Math.max(0.02, hitRateBase - evictionDegradation - ttlMissPenalty);

    const hits = incomingQps * hitRate;
    const misses = incomingQps - hits;

    return {
      outgoingQps: incomingQps,
      passthrough: misses,
      latency: 1 + (misses > 0 ? 5 : 0),
      errorRate: 0,
      queueDepth: 0,
      cacheHitRate: hitRate,
      readReplicasUsed: 0,
      metrics: { hits, misses, hitRate, evictionPolicy, ttlSeconds },
    };
  }
}
