import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class MetricsModel extends NodeModel {
  type = NodeType.METRICS;

  process(incomingQps: number, config: any): NodeResult {
    const writeThroughput = config?.writeThroughput || 100000;
    const readThroughput = config?.readThroughput || 20000;
    const timeSeriesCount = config?.timeSeriesCount || 10000;
    const isWrite = config?.isWrite ?? true;
    const capacity = isWrite ? writeThroughput : readThroughput;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: Math.min(incomingQps, capacity),
      latency: isOverloaded
        ? 50 + ((incomingQps - capacity) / capacity) * 100
        : isWrite
          ? 5 + (incomingQps / capacity) * 10
          : 20 + (incomingQps / capacity) * 30,
      errorRate: isOverloaded ? Math.min(30, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 1.5) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { writeThroughput, readThroughput, timeSeriesCount, isWrite },
    };
  }
}
