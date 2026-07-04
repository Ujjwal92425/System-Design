import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class LogsModel extends NodeModel {
  type = NodeType.LOGS;

  process(incomingQps: number, config: any): NodeResult {
    const ingestionRate = config?.ingestionRate || 50000;
    const queryRate = config?.queryRate || 500;
    const retentionDays = config?.retentionDays || 30;
    const isQuery = config?.isQuery ?? false;
    const capacity = isQuery ? queryRate : ingestionRate;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: 0,
      latency: isOverloaded
        ? 500 + ((incomingQps - capacity) / capacity) * 1000
        : isQuery
          ? 200 + (incomingQps / capacity) * 100
          : 10 + (incomingQps / capacity) * 20,
      errorRate: isOverloaded ? Math.min(40, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 3) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { ingestionRate, queryRate, retentionDays, isQuery },
    };
  }
}
