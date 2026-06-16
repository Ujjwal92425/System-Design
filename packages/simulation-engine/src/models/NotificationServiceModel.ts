import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class NotificationServiceModel extends NodeModel {
  type = NodeType.NOTIFICATION_SERVICE;

  process(incomingQps: number, config: any): NodeResult {
    const pushRate = config?.pushRate || 50000;
    const emailRate = config?.emailRate || 10000;
    const smsRate = config?.smsRate || 5000;
    const channel = config?.channel || 'push';
    const channelRate: Record<string, number> = { push: pushRate, email: emailRate, sms: smsRate };
    const capacity = channelRate[channel] || pushRate;
    const isOverloaded = incomingQps > capacity;

    return {
      outgoingQps: Math.min(incomingQps, capacity),
      passthrough: Math.min(incomingQps, capacity),
      latency: isOverloaded
        ? 200 + ((incomingQps - capacity) / capacity) * 400
        : channel === 'push' ? 50 + (incomingQps / capacity) * 30
          : channel === 'email' ? 100 + (incomingQps / capacity) * 50
            : 200 + (incomingQps / capacity) * 100,
      errorRate: isOverloaded ? Math.min(50, ((incomingQps - capacity) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - capacity) * 3) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { pushRate, emailRate, smsRate, channel },
    };
  }
}
