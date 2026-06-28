import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class JWTModel extends NodeModel {
  type = NodeType.JWT;

  process(incomingQps: number, config: any): NodeResult {
    const signingRate = config?.signingRate || 10000;
    const verificationRate = config?.verificationRate || 50000;
    const operation = config?.operation ?? 'verify';
    const keyRotationSec = config?.keyRotationSec ?? 86400;
    const capacity = operation === 'sign' ? signingRate : verificationRate;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: Math.min(incomingQps, capacity),
      latency: isOverloaded
        ? 10 + ((incomingQps - capacity) / capacity) * 50
        : operation === 'sign' ? 5 + (incomingQps / capacity) * 3 : 1,
      errorRate: isOverloaded ? Math.min(50, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 1.5) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { signingRate, verificationRate, operation, keyRotationSec },
    };
  }
}
