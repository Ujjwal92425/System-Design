import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class AuthServiceModel extends NodeModel {
  type = NodeType.AUTH_SERVICE;

  process(incomingQps: number, config: any): NodeResult {
    const tokenGenRate = config?.tokenGenRate || 5000;
    const tokenVerifyRate = config?.tokenVerifyRate || 20000;
    const operation = config?.operation ?? 'verify';
    const rateLimit = config?.rateLimitQps || 10000;
    const capacity = operation === 'generate' ? tokenGenRate : tokenVerifyRate;
    const effectiveCapacity = Math.min(capacity, rateLimit);
    const isOverloaded = incomingQps > effectiveCapacity;

    return {
      outgoingQps: Math.min(incomingQps, effectiveCapacity),
      passthrough: Math.min(incomingQps, effectiveCapacity),
      latency: isOverloaded
        ? 50 + ((incomingQps - effectiveCapacity) / effectiveCapacity) * 100
        : operation === 'generate' ? 20 + (incomingQps / effectiveCapacity) * 10 : 5,
      errorRate: isOverloaded ? Math.min(80, ((incomingQps - effectiveCapacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - effectiveCapacity) * 2) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { tokenGenRate, tokenVerifyRate, operation, rateLimit },
    };
  }
}
