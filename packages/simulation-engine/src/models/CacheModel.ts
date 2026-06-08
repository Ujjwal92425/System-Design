import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class CacheModel extends NodeModel {
  type = NodeType.CACHE;

  process(incomingQps: number, config: any): NodeResult {
    const hitRate = config?.hitRate || 0.8;
    const hits = incomingQps * hitRate;
    const misses = incomingQps - hits;

    return {
      outgoingQps: incomingQps,
      passthrough: misses,
      latency: config?.hitLatencyMs || 1,
      errorRate: 0,
      metrics: {
        hitRate,
        hits,
        misses
      }
    };
  }
}
