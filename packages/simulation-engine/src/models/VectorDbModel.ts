import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class VectorDbModel extends NodeModel {
  type = NodeType.VECTOR_DB;

  process(incomingQps: number, config: any): NodeResult {
    const indexSize = config?.indexSize || 1000000;
    const dimension = config?.dimension || 1536;
    const searchQps = config?.searchQps || 5000;
    const indexType = config?.indexType || 'hnsw';
    const efConstruction = config?.efConstruction || 200;
    const isOverloaded = incomingQps > searchQps;

    const searchLatency = indexType === 'hnsw'
      ? 5 + Math.max(0, Math.log10(indexSize / 10000)) * 10
      : indexType === 'ivf'
        ? 3 + Math.max(0, Math.log10(indexSize / 10000)) * 8
        : 20;

    return {
      outgoingQps: Math.min(incomingQps, searchQps),
      passthrough: 0,
      latency: isOverloaded
        ? searchLatency * 5 + ((incomingQps - searchQps) / searchQps) * 50
        : searchLatency + (incomingQps / searchQps) * searchLatency * 0.5,
      errorRate: isOverloaded ? Math.min(45, ((incomingQps - searchQps) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - searchQps) * 3) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { indexSize, dimension, searchQps, indexType, efConstruction },
    };
  }
}
