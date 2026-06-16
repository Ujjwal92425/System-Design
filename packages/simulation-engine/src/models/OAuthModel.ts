import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class OAuthModel extends NodeModel {
  type = NodeType.OAUTH;

  process(incomingQps: number, config: any): NodeResult {
    const authCodeRate = config?.authCodeRate || 3000;
    const tokenRefreshRate = config?.tokenRefreshRate || 15000;
    const operation = config?.operation ?? 'authorize';
    const capacity = operation === 'authorize' ? authCodeRate : tokenRefreshRate;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: Math.min(incomingQps, capacity),
      latency: isOverloaded ? 100 + ((incomingQps - capacity) / capacity) * 200 : operation === 'authorize' ? 40 : 15,
      errorRate: isOverloaded ? Math.min(70, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 3) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { authCodeRate, tokenRefreshRate, operation },
    };
  }
}
