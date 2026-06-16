import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class WebServerModel extends NodeModel {
  type = NodeType.WEB_SERVER;

  process(incomingQps: number, config: any): NodeResult {
    const threadPoolSize = config?.threadPoolSize || 200;
    const requestTimeoutMs = config?.requestTimeoutMs || 10000;
    const perThreadCapacity = 15;
    const totalCapacity = threadPoolSize * perThreadCapacity;
    const isOverloaded = incomingQps > totalCapacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - totalCapacity;
      qps = totalCapacity;
      errorRate = Math.min(90, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 3);
      latency = requestTimeoutMs * 0.5;
    } else {
      const rho = incomingQps / totalCapacity;
      if (rho > 0) {
        const cProb = erlangC(incomingQps, perThreadCapacity, threadPoolSize);
        queueDepth = Math.round(cProb * incomingQps * 0.5);
        latency = 10 + cProb * 50 + rho * 20;
      } else {
        latency = 10;
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
      metrics: { threadPoolSize, requestTimeoutMs, totalCapacity },
    };
  }
}
