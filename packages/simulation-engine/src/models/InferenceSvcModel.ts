import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class InferenceSvcModel extends NodeModel {
  type = NodeType.INFERENCE_SVC;

  process(incomingQps: number, config: any): NodeResult {
    const modelSizeB = config?.modelSizeB || 7;
    const batchSize = config?.batchSize || 1;
    const gpuCount = config?.gpuCount || 1;
    const quantization = config?.quantization || 'fp16';
    const throughputFactor = quantization === 'int4' ? 3 : quantization === 'int8' ? 2 : 1;
    const tokensPerSecPerGpu = 1000 / (modelSizeB * 0.5) * throughputFactor;
    const totalTokensPerSec = tokensPerSecPerGpu * gpuCount;
    const tokensPerRequest = config?.tokensPerRequest ?? 500;
    const capacity = Math.round((totalTokensPerSec / tokensPerRequest) * batchSize);
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: Math.min(incomingQps, capacity),
      latency: isOverloaded
        ? 5000 + ((incomingQps - capacity) / capacity) * 10000
        : (tokensPerRequest / totalTokensPerSec) * 1000 + (modelSizeB * 10),
      errorRate: isOverloaded ? Math.min(80, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 5) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { modelSizeB, batchSize, gpuCount, quantization, tokensPerSecPerGpu, totalTokensPerSec },
    };
  }
}
