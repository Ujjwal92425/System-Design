import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class FileStorageModel extends NodeModel {
  type = NodeType.FILE_STORAGE;

  process(incomingQps: number, config: any): NodeResult {
    const iopsLimit = config?.iopsLimit || 5000;
    const throughputMbps = config?.throughputMbps || 200;
    const avgFileSizeMb = config?.avgFileSizeMb ?? 1;
    const throughputQps = throughputMbps / avgFileSizeMb;
    const effectiveCapacity = Math.min(iopsLimit, throughputQps);
    const isOverloaded = incomingQps > effectiveCapacity;

    return {
      outgoingQps: Math.min(incomingQps, effectiveCapacity),
      passthrough: 0,
      latency: isOverloaded
        ? 50 + ((incomingQps - effectiveCapacity) / effectiveCapacity) * 200
        : 10 + (incomingQps / effectiveCapacity) * 15,
      errorRate: isOverloaded ? Math.min(40, ((incomingQps - effectiveCapacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - effectiveCapacity) * 2) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { iopsLimit, throughputMbps, avgFileSizeMb, effectiveCapacity },
    };
  }
}
