import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class DatabaseNoSqlModel extends NodeModel {
  type = NodeType.DATABASE_NOSQL;

  process(incomingQps: number, config: any): NodeResult {
    const connectionPoolSize = config?.connectionPoolSize || 100;
    const readReplicaCount = config?.readReplicaCount || 3;
    const baseCapacityPerNode = 3000;
    const totalCapacity = baseCapacityPerNode * (1 + readReplicaCount);
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
      latency = 10 + (excess * 0.3);
    } else {
      errorRate = 0;
      const rho = incomingQps / totalCapacity;
      if (rho > 0.7) {
        const cProb = erlangC(incomingQps / (1 + readReplicaCount), 100, connectionPoolSize);
        queueDepth = Math.round(cProb * incomingQps * 0.2);
        latency = 8 + cProb * 15;
      } else {
        latency = 5 + rho * 10;
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
