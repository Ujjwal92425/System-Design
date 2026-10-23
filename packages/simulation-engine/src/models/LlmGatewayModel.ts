import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class LlmGatewayModel extends NodeModel {
  type = NodeType.LLM_GATEWAY;

  process(incomingQps: number, config: any): NodeResult {
    const tokensPerSecond = config?.tokensPerSecond || 10000;
    const contextWindow = config?.contextWindow || 128000;
    const avgTokensPerRequest = config?.avgTokensPerRequest ?? 2000;
    const rateLimitQps = config?.rateLimitQps ?? 1000;
    const modelName = config?.modelName || 'claude-sonnet-4';
    const tokenCapacity = tokensPerSecond / avgTokensPerRequest;
    const effectiveCapacity = Math.min(rateLimitQps, tokenCapacity);
    const isOverloaded = incomingQps > effectiveCapacity;

    return {
      outgoingQps: Math.min(incomingQps, effectiveCapacity),
      passthrough: Math.min(incomingQps, effectiveCapacity),
      latency: isOverloaded
        ? 2000 + ((incomingQps - effectiveCapacity) / effectiveCapacity) * 5000
        : (avgTokensPerRequest / tokensPerSecond) * 1000 + 100,
      errorRate: isOverloaded ? Math.min(90, ((incomingQps - effectiveCapacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - effectiveCapacity) * 5) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { tokensPerSecond, contextWindow, avgTokensPerRequest, rateLimitQps, modelName },
    };
  }
}
