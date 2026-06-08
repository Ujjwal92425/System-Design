import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class LoadBalancerModel extends NodeModel {
  type = NodeType.LOAD_BALANCER;

  process(incomingQps: number, config: any): NodeResult {
    const capacity = config?.capacity || 10000;
    const isOverloaded = incomingQps > capacity;
    
    return {
      outgoingQps: incomingQps,
      passthrough: incomingQps,
      latency: config?.latency || 5 + (isOverloaded ? (incomingQps - capacity) / 100 : 0),
      errorRate: isOverloaded ? Math.min(100, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      metrics: {
        utilizationPct: Math.min(100, (incomingQps / capacity) * 100)
      }
    };
  }
}
