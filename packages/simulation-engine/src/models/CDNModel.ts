import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class CDNModel extends NodeModel {
  type = NodeType.CDN;

  process(incomingQps: number, config: any): NodeResult {
    const hitRatioOverride = config?.hitRatioOverride ?? 90;
    const hitRate = hitRatioOverride / 100;

    const hits = incomingQps * hitRate;
    const misses = incomingQps - hits;

    return {
      outgoingQps: incomingQps,
      passthrough: misses,
      latency: 5 + (misses > 0 ? 20 : 0),
      errorRate: 0,
      queueDepth: 0,
      cacheHitRate: hitRate,
      readReplicasUsed: 0,
      metrics: { hitRate, hits, misses },
    };
  }
}
