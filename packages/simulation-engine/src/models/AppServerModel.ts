import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class AppServerModel extends NodeModel {
  type = NodeType.APP_SERVER;

  process(incomingQps: number, config: any): NodeResult {
    const threadPoolSize = config?.threadPoolSize || 150;
    const requestTimeoutMs = config?.requestTimeoutMs || 30000;
    const sessionReplication = config?.sessionReplication ?? false;
    const perThreadQps = sessionReplication ? 10 : 18;
    const totalCapacity = threadPoolSize * perThreadQps;
    const isOverloaded = incomingQps > totalCapacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - totalCapacity;
      qps = totalCapacity;
      errorRate = Math.min(85, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 4);
      latency = requestTimeoutMs * 0.4;
    } else {
      const rho = incomingQps / totalCapacity;
      if (rho > 0) {
        const cProb = erlangC(incomingQps, perThreadQps, threadPoolSize);
        queueDepth = Math.round(cProb * incomingQps * 0.5);
        const sessionOverhead = sessionReplication ? 15 : 0;
        latency = 20 + sessionOverhead + cProb * 30 + rho * 25;
      } else {
        latency = sessionReplication ? 35 : 20;
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
      metrics: { threadPoolSize, sessionReplication, totalCapacity },
    };
  }
}
