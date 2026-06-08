import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class DatabaseModel extends NodeModel {
  type = NodeType.DATABASE_SQL;

  process(incomingQps: number, config: any): NodeResult {
    const capacity = config?.capacity || 2000;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: incomingQps,
      passthrough: 0,
      latency: config?.latency || 20 + (isOverloaded ? (incomingQps - capacity) / 5 : 0),
      errorRate: isOverloaded ? Math.min(100, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      metrics: {
        activeConnections: Math.min(100, (incomingQps / capacity) * 100)
      }
    };
  }
}
