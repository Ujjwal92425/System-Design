import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class EmbeddingSvcModel extends NodeModel {
  type = NodeType.EMBEDDING_SVC;

  process(incomingQps: number, config: any): NodeResult {
    const batchSize = config?.batchSize || 32;
    const embeddingDim = config?.embeddingDim || 1536;
    const throughput = config?.throughput || 2000;
    const isOverloaded = incomingQps > throughput;

    return {
      outgoingQps: Math.min(incomingQps, throughput),
      passthrough: Math.min(incomingQps, throughput),
      latency: isOverloaded
        ? 200 + ((incomingQps - throughput) / throughput) * 300
        : 50 + (incomingQps / throughput) * 50 + (embeddingDim / 1536) * 20,
      errorRate: isOverloaded ? Math.min(40, ((incomingQps - throughput) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - throughput) * 4) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { batchSize, embeddingDim, throughput },
    };
  }
}
