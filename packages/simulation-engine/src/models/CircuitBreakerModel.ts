import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerModel extends NodeModel {
  type = NodeType.CIRCUIT_BREAKER;

  private failureCount: number = 0;
  private state: State = 'CLOSED';
  private openSinceTick: number = -1;

  process(incomingQps: number, config: any, tick?: number): NodeResult {
    const threshold = config?.failureThreshold || 5;
    const halfOpenMaxQps = config?.halfOpenMaxQps || 100;
    const recoveryTimeoutMs = config?.recoveryTimeoutMs || 30000;
    const tickIntervalMs = config?.tickIntervalMs || 1000;
    const recoveryTicks = Math.ceil(recoveryTimeoutMs / tickIntervalMs);

    let qps = 0;
    let errorRate = 0;
    let latency = 0;
    let rejectRate = 0;

    if (this.state === 'OPEN') {
      if (this.openSinceTick < 0) this.openSinceTick = tick ?? 0;
      const elapsed = (tick ?? 0) - this.openSinceTick;

      if (elapsed >= recoveryTicks) {
        this.state = 'HALF_OPEN';
      } else {
        qps = 0;
        errorRate = 0;
        latency = 1;
        rejectRate = 100;
        return this.buildResult(qps, latency, errorRate, rejectRate, threshold);
      }
    }

    if (this.state === 'HALF_OPEN') {
      const probeRate = Math.min(incomingQps, halfOpenMaxQps);
      const rejectedQps = Math.max(0, incomingQps - probeRate);
      qps = probeRate;
      errorRate = 0;
      latency = 5;
      rejectRate = incomingQps > 0 ? (rejectedQps / incomingQps) * 100 : 0;

      const upstreamErrorRate = config?.upstreamErrorRate || 0;
      if (upstreamErrorRate > 0 && Math.random() < upstreamErrorRate) {
        this.state = 'OPEN';
        this.openSinceTick = tick ?? 0;
      } else {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return this.buildResult(qps, latency, errorRate, rejectRate, threshold);
    }

    // CLOSED state
    {
      const errorProb = config?.upstreamErrorRate || 0;
      if (errorProb > 0 && Math.random() < errorProb) {
        this.failureCount++;
      }

      if (this.failureCount >= threshold) {
        this.state = 'OPEN';
        this.openSinceTick = tick ?? 0;
      }

      qps = incomingQps;
      errorRate = 0;
      latency = 2;
      rejectRate = 0;
    }

    return this.buildResult(qps, latency, errorRate, rejectRate, threshold);
  }

  private buildResult(qps: number, latency: number, errorRate: number, rejectRate: number, threshold: number): NodeResult {
    return {
      outgoingQps: qps,
      passthrough: 0,
      latency: rejectRate > 0 ? 1 : latency,
      errorRate: rejectRate > 50 ? Math.min(80, rejectRate) : 0,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: {
        state: this.state,
        failureCount: this.failureCount,
        rejectRate: Math.round(rejectRate * 10) / 10,
        threshold,
        statusIcon: this.state === 'OPEN' ? '!' : this.state === 'HALF_OPEN' ? '?' : '+',
      },
    };
  }
}