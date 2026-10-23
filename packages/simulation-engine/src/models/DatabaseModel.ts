import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class DatabaseModel extends NodeModel {
  type = NodeType.DATABASE_SQL;

  process(incomingQps: number, config: any): NodeResult {
    const connectionPoolSize = config?.connectionPoolSize || 50;
    const readReplicaCount = config?.readReplicaCount || 0;
    const baseCapacityPerNode = 800;
    const totalCapacity = baseCapacityPerNode * (1 + readReplicaCount);
    const perConnectionQps = incomingQps / connectionPoolSize;
    const isOverloaded = incomingQps > totalCapacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - totalCapacity;
      qps = totalCapacity;
      errorRate = Math.min(95, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 2);
      latency = 20 + (excess * 0.5);
    } else {
      errorRate = 0;
      const rho = incomingQps / totalCapacity;
      if (rho > 0.7) {
        const cProb = erlangC(incomingQps / (1 + readReplicaCount), 50, connectionPoolSize);
        queueDepth = Math.round(cProb * incomingQps * 0.3);
        latency = 20 + cProb * 30;
      } else {
        latency = 15 + (incomingQps / totalCapacity) * 10;
      }
      qps = incomingQps;
    }

    return {
      outgoingQps: qps,
      passthrough: 0,
      latency,
      errorRate,
      queueDepth,
      cacheHitRate: 0,
      readReplicasUsed: Math.min(readReplicaCount, Math.ceil(incomingQps / baseCapacityPerNode)),
      metrics: { connectionPoolSize, readReplicaCount, totalCapacity },
    };
  }
}
