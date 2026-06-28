export type FailureMode = 'KILL' | 'THROTTLE' | 'PARTITION' | 'QUEUE_BACKUP' | 'CACHE_EVICTION';

export interface FailureEvent {
  nodeId: string;
  mode: FailureMode;
  severity: number;
  startTick: number;
  autoRecoverAfterTicks?: number;
}

export interface NodeFailureResult {
  outgoingQps: number;
  passthrough: number;
  latency: number;
  errorRate: number;
  queueDepth: number;
  cacheHitRate: number;
  readReplicasUsed: number;
  reason: string;
}

export class FailureScenario {
  static kill(incomingQps: number): NodeFailureResult {
    return {
      outgoingQps: 0,
      passthrough: 0,
      latency: 5000,
      errorRate: 100,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      reason: 'Node killed — all connections refused',
    };
  }

  static throttle(incomingQps: number, severity: number, baseLatency: number): NodeFailureResult {
    const passPct = Math.max(0.05, 1 - severity * 0.95);
    const outgoing = incomingQps * passPct;
    const droppedPct = (1 - passPct) * 100;

    return {
      outgoingQps: outgoing,
      passthrough: outgoing,
      latency: baseLatency * (1 + severity * 15),
      errorRate: droppedPct,
      queueDepth: Math.round((incomingQps - outgoing) * 2),
      cacheHitRate: 0,
      readReplicasUsed: 0,
      reason: `Throttled to ${Math.round(passPct * 100)}% capacity — ${Math.round(droppedPct)}% requests dropped`,
    };
  }

  static partition(incomingQps: number, severity: number): NodeFailureResult {
    const lostPct = severity;
    const delivered = incomingQps * (1 - lostPct);

    return {
      outgoingQps: delivered,
      passthrough: delivered,
      latency: 30000,
      errorRate: lostPct * 100,
      queueDepth: Math.round(lostPct * incomingQps),
      cacheHitRate: 0,
      readReplicasUsed: 0,
      reason: `Network partition — ${Math.round(lostPct * 100)}% traffic lost`,
    };
  }

  static queueBackup(
    incomingQps: number,
    processingRate: number,
    severity: number,
  ): NodeFailureResult {
    const effectiveRate = processingRate * (1 - severity * 0.9);
    const overflow = Math.max(0, incomingQps - effectiveRate);
    const errorRate = Math.min(100, (overflow / Math.max(incomingQps, 1)) * 100);

    return {
      outgoingQps: effectiveRate,
      passthrough: 0,
      latency: 50 + (severity * 400),
      errorRate,
      queueDepth: Math.round(overflow * 5),
      cacheHitRate: 0,
      readReplicasUsed: 0,
      reason: `Queue backup — consumer at ${Math.round((1 - severity) * 100)}% rate, ${Math.round(overflow)} msg/s accumulating`,
    };
  }

  static cacheEviction(
    incomingQps: number,
    originalHitRate: number,
  ): NodeFailureResult {
    const evictedHitRate = 0.02;
    const missRate = 1 - evictedHitRate;
    const passThroughQps = incomingQps * missRate;

    return {
      outgoingQps: passThroughQps,
      passthrough: passThroughQps,
      latency: 2 + (40 * missRate),
      errorRate: 0,
      queueDepth: 0,
      cacheHitRate: evictedHitRate,
      readReplicasUsed: 0,
      reason: `Cache eviction — hit rate collapsed from ${Math.round(originalHitRate * 100)}% → 2%, DB hammering`,
    };
  }

  static injectLatency(originalLatency: number, failureRate: number): number {
    return Math.random() < failureRate ? originalLatency * 10 : originalLatency;
  }
}
