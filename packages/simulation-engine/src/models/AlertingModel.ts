import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class AlertingModel extends NodeModel {
  type = NodeType.ALERTING;

  process(incomingQps: number, config: any): NodeResult {
    const ruleEvalRate = config?.ruleEvalRate || 20000;
    const notificationChannelCount = config?.notificationChannelCount || 5;
    const alertThreshold = config?.alertThreshold ?? 0.8;
    const isOverloaded = incomingQps > ruleEvalRate;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - ruleEvalRate;
      qps = ruleEvalRate;
      errorRate = Math.min(35, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 4);
      latency = 100 + (excess / 100);
    } else {
      const rho = incomingQps / ruleEvalRate;
      if (rho > alertThreshold) {
        const cProb = erlangC(incomingQps, 50, notificationChannelCount);
        queueDepth = Math.round(cProb * incomingQps * notificationChannelCount);
        latency = 30 + cProb * 50 + (rho - alertThreshold) * 100;
      } else {
        latency = 20 + rho * 10;
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
      metrics: {
        ruleEvalRate,
        notificationChannelCount,
        alertThreshold,
        activeAlerts: Math.round(incomingQps * 0.05),
      },
    };
  }
}
