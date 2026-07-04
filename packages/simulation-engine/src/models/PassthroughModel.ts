import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class PassthroughModel extends NodeModel {
  type = NodeType.NOTE;

  process(incomingQps: number, config: any): NodeResult {
    return {
      outgoingQps: incomingQps,
      passthrough: incomingQps,
      latency: config?.latency || 2,
      errorRate: 0,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
    };
  }
}
