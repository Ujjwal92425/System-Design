import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class ServerlessFnModel extends NodeModel {
  type = NodeType.SERVERLESS_FN;

  process(incomingQps: number, config: any): NodeResult {
    const concurrentExecutions = config?.concurrentExecutions ?? 1000;
    const coldStartMs = config?.coldStartMs ?? 500;
    const invocationTimeoutMs = config?.invocationTimeoutMs ?? 90000;
    const avgDurationMs = config?.avgDurationMs ?? 100;
    const isCold = config?.isCold ?? Math.random() < 0.05;
    const isOverloaded = incomingQps > concurrentExecutions;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = incomingQps - concurrentExecutions;
      qps = concurrentExecutions;
      errorRate = Math.min(95, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 10);
      latency = invocationTimeoutMs;
    } else {
      qps = incomingQps;
      errorRate = 0;
      latency = avgDurationMs + (isCold ? coldStartMs : 0);
      queueDepth = 0;
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
        concurrentExecutions,
        coldStartMs,
        isCold,
        avgDurationMs,
        throttled: isOverloaded,
      },
    };
  }
}
