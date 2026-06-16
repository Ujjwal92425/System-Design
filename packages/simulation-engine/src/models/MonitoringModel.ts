import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class MonitoringModel extends NodeModel {
  type = NodeType.MONITORING;

  process(incomingQps: number, config: any): NodeResult {
    const metricIngestionRate = config?.metricIngestionRate || 100000;
    const alertRuleCount = config?.alertRuleCount || 500;
    const retentionDays = config?.retentionDays || 30;
    const isOverloaded = incomingQps > metricIngestionRate;

    return {
      outgoingQps: Math.min(incomingQps, metricIngestionRate),
      passthrough: Math.min(incomingQps, metricIngestionRate),
      latency: isOverloaded
        ? 100 + ((incomingQps - metricIngestionRate) / metricIngestionRate) * 200
        : 20 + (incomingQps / metricIngestionRate) * 30,
      errorRate: isOverloaded ? Math.min(30, ((incomingQps - metricIngestionRate) / incomingQps) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((incomingQps - metricIngestionRate) * 2) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { metricIngestionRate, alertRuleCount, retentionDays },
    };
  }
}
