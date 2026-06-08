import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class QueueModel extends NodeModel {
  type = NodeType.QUEUE;

  process(incomingQps: number, config: any): NodeResult {
    const processingRate = config?.processingRate || 3000;
    const queueDepth = Math.max(0, incomingQps - processingRate);

    return {
      outgoingQps: Math.min(incomingQps, processingRate),
      passthrough: 0,
      latency: config?.latency || 2,
      errorRate: 0,
      metrics: {
        queueDepth
      }
    };
  }
}
