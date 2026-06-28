import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class PubSubModel extends NodeModel {
  type = NodeType.PUBSUB;

  process(incomingQps: number, config: any): NodeResult {
    const topicCount = config?.topicCount || 10;
    const subscriptionCount = config?.subscriptionCount || 3;
    const throughputPerTopic = config?.throughputPerTopic ?? 5000;
    const totalCapacity = topicCount * throughputPerTopic;
    const fanOut = subscriptionCount;
    const effectiveEgress = incomingQps * fanOut;
    const isOverloaded = incomingQps > totalCapacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - totalCapacity;
      qps = totalCapacity;
      errorRate = Math.min(70, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 3);
      latency = 20 + (excess / 100);
    } else {
      const rho = incomingQps / totalCapacity;
      if (rho > 0.7) {
        queueDepth = Math.round(incomingQps * (rho - 0.7) * 5);
        latency = 10 + (rho - 0.7) * 50;
      } else {
        latency = 5 + rho * 5;
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
      metrics: { topicCount, subscriptionCount, throughputPerTopic, fanOut, effectiveEgress },
    };
  }
}
