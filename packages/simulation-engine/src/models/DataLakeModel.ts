import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class DataLakeModel extends NodeModel {
  type = NodeType.DATA_LAKE;

  process(incomingQps: number, config: any): NodeResult {
    const ingestionRate = config?.ingestionRate || 5000;
    const queryCapacity = config?.queryCapacity || 200;
    const storageTb = config?.storageTb || 100;
    const isQuery = config?.isQuery ?? false;
    const capacity = isQuery ? queryCapacity : ingestionRate;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: incomingQps,
      passthrough: 0,
      latency: isOverloaded
        ? 2000 + ((incomingQps - capacity) / capacity) * 5000
        : isQuery ? 500 + (incomingQps / capacity) * 300 : 100 + (incomingQps / capacity) * 50,
      errorRate: isOverloaded ? Math.min(60, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 5) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { ingestionRate, queryCapacity, storageTb, isQuery },
    };
  }
}
