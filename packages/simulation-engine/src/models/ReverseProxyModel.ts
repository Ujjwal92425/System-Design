import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class ReverseProxyModel extends NodeModel {
  type = NodeType.REVERSE_PROXY;

  process(incomingQps: number, config: any): NodeResult {
    const connectionPoolSize = config?.connectionPoolSize || 500;
    const upstreamCount = config?.upstreamCount || 5;
    const perConnectionQps = 50;
    const totalCapacity = connectionPoolSize * perConnectionQps;
    const isOverloaded = incomingQps > totalCapacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - totalCapacity;
      qps = totalCapacity;
      errorRate = Math.min(70, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 2);
      latency = 10 + (excess / 200);
    } else {
      const rho = incomingQps / totalCapacity;
      if (rho > 0.6) {
        const cProb = erlangC(incomingQps, perConnectionQps, connectionPoolSize);
        queueDepth = Math.round(cProb * incomingQps);
        latency = 5 + cProb * 10 + rho * 8;
      } else {
        latency = 2 + rho * 3;
      }
      qps = incomingQps;
      errorRate = 0;
    }

    return {
      outgoingQps: qps,
      passthrough: qps,
      latency,
      errorRate,
      queueDepth,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { connectionPoolSize, upstreamCount, totalCapacity },
    };
  }
}
