/**
 * ChaosScenario — orchestrates multiple simultaneous FailureEvents
 * and provides helpers for resolving which failure mode applies to a node
 * at a given simulation tick.
 */

import { FailureEvent, FailureMode } from './FailureScenario';

export interface ChaosEvent {
  id: string;
  nodeId: string;
  mode: FailureMode;
  severity: number;
  startTick: number;
  autoRecoverAfterTicks?: number;
  /** ISO timestamp of injection for the events-log panel */
  injectedAt: string;
}

export class ChaosScenario {
  private events: Map<string, ChaosEvent> = new Map();

  /** Inject a failure into the active scenario */
  inject(event: Omit<ChaosEvent, 'id' | 'injectedAt'>): ChaosEvent {
    const id = `chaos-${event.nodeId}-${event.mode}-${Date.now()}`;
    const full: ChaosEvent = {
      ...event,
      id,
      injectedAt: new Date().toISOString(),
    };
    this.events.set(id, full);
    return full;
  }

  /** Kill a node: outputs zero, all traffic fails */
  kill(nodeId: string, tick: number, autoRecoverAfterTicks?: number): ChaosEvent {
    return this.inject({ nodeId, mode: 'KILL', severity: 1, startTick: tick, autoRecoverAfterTicks });
  }

  /** Throttle a node to a given severity (0–1) */
  throttle(nodeId: string, tick: number, severity = 0.7): ChaosEvent {
    return this.inject({ nodeId, mode: 'THROTTLE', severity, startTick: tick });
  }

  /** Network partition — severs edges between nodeId and its downstream */
  partition(nodeId: string, tick: number, severity = 1.0): ChaosEvent {
    return this.inject({ nodeId, mode: 'PARTITION', severity, startTick: tick });
  }

  /** Stall a queue consumer */
  stallQueue(nodeId: string, tick: number, severity = 0.9): ChaosEvent {
    return this.inject({ nodeId, mode: 'QUEUE_BACKUP', severity, startTick: tick });
  }

  /** Evict cache — force stampede */
  evictCache(nodeId: string, tick: number): ChaosEvent {
    return this.inject({ nodeId, mode: 'CACHE_EVICTION', severity: 1, startTick: tick });
  }

  /**
   * Resolve which (if any) failure event is active for a node at the given tick.
   * Auto-recovers events whose recovery window has elapsed.
   */
  getActiveFailure(nodeId: string, currentTick: number): ChaosEvent | null {
    for (const [id, event] of this.events) {
      if (event.nodeId !== nodeId) continue;

      // Auto-recovery check
      if (
        event.autoRecoverAfterTicks !== undefined &&
        currentTick >= event.startTick + event.autoRecoverAfterTicks
      ) {
        this.events.delete(id);
        continue;
      }

      return event;
    }
    return null;
  }

  /** Manually heal a node — removes all active events for it */
  heal(nodeId: string): void {
    for (const [id, event] of this.events) {
      if (event.nodeId === nodeId) this.events.delete(id);
    }
  }

  /** All currently active chaos events (for the events-log panel) */
  getAllActive(): ChaosEvent[] {
    return Array.from(this.events.values());
  }

  /** Clear everything */
  reset(): void {
    this.events.clear();
  }

  // ── Static helpers ───────────────────────────────────────────────────────────

  /** Check if a node ID is in the active failures set (legacy-compatible shim) */
  static isNodeFailing(nodeId: string, activeFailures: Set<string>): boolean {
    return activeFailures.has(nodeId);
  }

  /**
   * Build a failure heatmap — useful for rendering a visual legend.
   * Returns a map of nodeId → severity (0 absent, 0–1 for active events).
   */
  static buildHeatmap(events: ChaosEvent[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const event of events) {
      const existing = map.get(event.nodeId) ?? 0;
      map.set(event.nodeId, Math.max(existing, event.severity));
    }
    return map;
  }
}
