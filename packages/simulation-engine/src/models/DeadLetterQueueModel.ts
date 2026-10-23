import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class DeadLetterQueueModel extends NodeModel {
  type = NodeType.DEAD_LETTER_QUEUE;

  process(incomingQps: number, config: any): NodeResult {
    const maxRetryCount = config?.maxRetryCount || 3;
    const dlqBaseRate = config?.dlqBaseRate || 0.02;
    const processingRate = config?.processingRate || 500;

    const dlqRate = Math.min(0.5, dlqBaseRate * Math.log2(Math.max(2, incomingQps / 100)));
    const dlqIncoming = incomingQps * dlqRate;
    const healthyQps = incomingQps * (1 - dlqRate);

    const isOverloaded = dlqIncoming > processingRate;
    let latency: number;
    let queueDepth: number;
    let dlqDepth: number;

    if (isOverloaded) {
      const overflow = dlqIncoming - processingRate;
      dlqDepth = Math.round(overflow * 10);
      queueDepth = Math.round(dlqDepth / maxRetryCount);
      latency = 100 + (overflow / processingRate) * 1000;
    } else {
      dlqDepth = 0;
      queueDepth = Math.round(healthyQps * 0.1);
      latency = 10 + (dlqIncoming / Math.max(1, processingRate)) * 50;
    }

    const retryQps = dlqIncoming * 0.3;
    const deadQps = dlqIncoming - retryQps;

    return {
      outgoingQps: healthyQps + retryQps,
      passthrough: 0,
      latency,
      errorRate: deadQps > 0 ? Math.min(30, (deadQps / Math.max(1, incomingQps)) * 100) : 0,
      queueDepth,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: {
        dlqInRate: Math.round(dlqRate * 1000) / 10,
        dlqDepth,
        retryQps: Math.round(retryQps),
        deadQps: Math.round(deadQps),
        maxRetryCount,
        processingRate,
      },
    };
  }
}
