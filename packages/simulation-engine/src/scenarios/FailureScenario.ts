/**
 * FailureScenario — pure-function helpers that compute the per-node effects
 * of various failure modes.  All functions are deterministic given the same
 * input, making them trivially testable.
 */

export type FailureMode = 'KILL' | 'THROTTLE' | 'PARTITION' | 'QUEUE_BACKUP' | 'CACHE_EVICTION';

export interface FailureEvent {
  nodeId: string;
  mode: FailureMode;
  /** 0–1 severity; 1 = complete failure */
  severity: number;
  /** Tick at which the failure was injected */
  startTick: number;
  /** Auto-recover after this many ticks (undefined = manual-only) */
  autoRecoverAfterTicks?: number;
}

export interface NodeFailureResult {
  outgoingQps: number;
  latency: number;
  errorRate: number;
  /** Human-readable reason appended to the events log */
  reason: string;
}

export class FailureScenario {
  /**
   * KILL — node produces zero output; all requests fail immediately.
   */
  static kill(incomingQps: number): NodeFailureResult {
    return {
      outgoingQps: 0,
      latency: 5000,          // hard timeout
      errorRate: 100,
      reason: 'Node killed — all connections refused',
    };
  }

  /**
   * THROTTLE — node stays alive but processes traffic at a reduced rate,
   * excess requests queue and eventually time-out.
   */
  static throttle(incomingQps: number, severity: number, baseLatency: number): NodeFailureResult {
    // severity 1 → only 5% pass; severity 0 → 100% pass
    const passPct = Math.max(0.05, 1 - severity * 0.95);
    const outgoing = incomingQps * passPct;
    const droppedPct = (1 - passPct) * 100;

    return {
      outgoingQps: outgoing,
      latency: baseLatency * (1 + severity * 15),
      errorRate: droppedPct,
      reason: `Throttled to ${Math.round(passPct * 100)}% capacity — ${Math.round(droppedPct)}% requests dropped`,
    };
  }

  /**
   * PARTITION — traffic that should traverse an edge is dropped.
   * Returns effective QPS reaching the target side of the partition.
   */
  static partition(incomingQps: number, severity: number): NodeFailureResult {
    const lostPct = severity;                 // severity 1 = total partition
    const delivered = incomingQps * (1 - lostPct);

    return {
      outgoingQps: delivered,
      latency: 30000,                          // connection-timeout emulation
      errorRate: lostPct * 100,
      reason: `Network partition — ${Math.round(lostPct * 100)}% traffic lost`,
    };
  }

  /**
   * QUEUE_BACKUP — consumer is stalled; queue depth grows every tick.
   * Returns metrics for the queue node itself.
   */
  static queueBackup(
    incomingQps: number,
    processingRate: number,
    severity: number,
  ): NodeFailureResult & { queueDepth: number } {
    // Reduce consumer throughput by severity
    const effectiveRate = processingRate * (1 - severity * 0.9);
    const overflow = Math.max(0, incomingQps - effectiveRate);
    const errorRate = Math.min(100, (overflow / Math.max(incomingQps, 1)) * 100);

    return {
      outgoingQps: effectiveRate,
      latency: 50 + (severity * 400),
      errorRate,
      queueDepth: Math.round(overflow * 5),   // proxy: messages backlogged
      reason: `Queue backup — consumer at ${Math.round((1 - severity) * 100)}% rate, ${Math.round(overflow)} msg/s accumulating`,
    };
  }

  /**
   * CACHE_EVICTION — hit rate drops to near 0%; all requests fall through
   * to the origin (typically a database).
   */
  static cacheEviction(
    incomingQps: number,
    originalHitRate: number,
  ): NodeFailureResult & { missRate: number } {
    // Simulate a stampede: cache is effectively cold
    const evictedHitRate = 0.02;
    const missRate = 1 - evictedHitRate;
    const passThroughQps = incomingQps * missRate;

    return {
      outgoingQps: passThroughQps,
      latency: 2 + (40 * missRate),           // mix of cache-hit and DB latency
      errorRate: 0,
      missRate,
      reason: `Cache eviction — hit rate collapsed from ${Math.round(originalHitRate * 100)}% → 2%, DB hammering`,
    };
  }

  /**
   * Legacy compat shim — spike latency by a failure rate probability.
   */
  static injectLatency(originalLatency: number, failureRate: number): number {
    return Math.random() < failureRate ? originalLatency * 10 : originalLatency;
  }
}
