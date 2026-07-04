import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class ObjectStorageModel extends NodeModel {
  type = NodeType.OBJECT_STORAGE;

  process(incomingQps: number, config: any): NodeResult {
    const capacity = config?.capacity || 20000;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: 0,
      latency: isOverloaded ? 100 + (incomingQps - capacity) / 10 : 30,
      errorRate: isOverloaded ? Math.min(50, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 2) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { capacity, utilizationPct: Math.min(100, (incomingQps / capacity) * 100) },
    };
  }
}
