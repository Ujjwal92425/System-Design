import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class WafModel extends NodeModel {
  type = NodeType.WAF;

  process(incomingQps: number, config: any): NodeResult {
    const ruleEvalRate = config?.ruleEvalRate || 50000;
    const blockRate = config?.blockRate ?? 0.05;
    const isOverloaded = incomingQps > ruleEvalRate;

    let qps: number;
    let latency: number;
    let errorRate: number;

    if (isOverloaded) {
      const excess = incomingQps - ruleEvalRate;
      const passed = ruleEvalRate * (1 - blockRate);
      qps = passed;
      errorRate = Math.min(95, ((incomingQps - passed) / incomingQps) * 100);
      latency = 20 + (excess / 100);
    } else {
      const blocked = incomingQps * blockRate;
      qps = incomingQps - blocked;
      errorRate = blockRate * 100;
      latency = 5 + (incomingQps / ruleEvalRate) * 5;
    }

    return {
      outgoingQps: qps,
      passthrough: qps,
      latency,
      errorRate,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { ruleEvalRate, blockRate, rulesEvaluated: Math.round(incomingQps) },
    };
  }
}
