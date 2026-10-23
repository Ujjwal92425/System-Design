import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class RagServiceModel extends NodeModel {
  type = NodeType.RAG_SERVICE;

  process(incomingQps: number, config: any): NodeResult {
    const chunkSize = config?.chunkSize || 512;
    const topK = config?.topK || 5;
    const retrievalLatencyMs = config?.retrievalLatencyMs ?? 50;
    const rerankEnabled = config?.rerankEnabled ?? true;
    const totalLatency = retrievalLatencyMs + chunkSize * 0.05 + (rerankEnabled ? 30 : 0) + topK * 2;
    const capacity = config?.capacity || 2000;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: Math.min(incomingQps, capacity),
      latency: isOverloaded
        ? totalLatency * 3 + ((incomingQps - capacity) / capacity) * 200
        : totalLatency + (incomingQps / capacity) * totalLatency * 0.3,
      errorRate: isOverloaded ? Math.min(30, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 3) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { chunkSize, topK, rerankEnabled, retrievalLatencyMs },
    };
  }
}
