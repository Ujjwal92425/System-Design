import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class CircuitBreakerModel extends NodeModel {
  type = NodeType.CIRCUIT_BREAKER;

  private failureCount: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  process(incomingQps: number, config: any): NodeResult {
    const threshold = config?.failureThreshold || 5;
    const halfOpenMaxQps = config?.halfOpenMaxQps || 100;
    const recoveryTimeoutMs = config?.recoveryTimeoutMs || 30000;

    let qps: number;
    let errorRate: number;
    let latency: number;
    let rejectRate: number;

    if (this.state === 'OPEN') {
      const rejectedQps = Math.max(0, incomingQps - halfOpenMaxQps);
      qps = Math.min(incomingQps, halfOpenMaxQps);
      errorRate = 0;
      latency = 1;
      rejectRate = incomingQps > 0 ? (rejectedQps / incomingQps) * 100 : 0;

      if (incomingQps <= halfOpenMaxQps) {
        this.state = 'HALF_OPEN';
      }
    } else if (this.state === 'HALF_OPEN') {
      const probeRate = Math.min(incomingQps, halfOpenMaxQps * 0.1);
      const rejectedQps = Math.max(0, incomingQps - probeRate);
      qps = probeRate;
      errorRate = 0;
      latency = 5;
      rejectRate = (rejectedQps / Math.max(1, incomingQps)) * 100;

      this.state = 'CLOSED';
      this.failureCount = 0;
    } else {
      const errorProb = config?.upstreamErrorRate || 0;
      if (errorProb > 0 && Math.random() < errorProb) {
        this.failureCount++;
      }

      if (this.failureCount >= threshold) {
        this.state = 'OPEN';
      }

      qps = incomingQps;
      errorRate = 0;
      latency = 2;
      rejectRate = 0;
    }

    const statusIcon = this.state === 'OPEN' ? '!' :
      this.state === 'HALF_OPEN' ? '?' : '+';

    return {
      outgoingQps: qps,
      passthrough: 0,
      latency: latency + (rejectRate > 0 ? 50 : 0),
      errorRate: rejectRate > 50 ? Math.min(80, rejectRate) : 0,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: {
        state: this.state,
        failureCount: this.failureCount,
        rejectRate: Math.round(rejectRate * 10) / 10,
        threshold,
        statusIcon
      },
    };
  }
}
