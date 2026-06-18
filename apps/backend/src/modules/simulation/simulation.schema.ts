/**
 * apps/backend/src/modules/simulation/simulation.schema.ts
 *
 * Zod validation schemas for the Simulation API.
 *
 * CHANGE: New file — full validation for simulation config,
 *          run save, and query parameters.
 */

import { z } from 'zod';

// ── Chaos event schema ───────────────────────────────────────────────────
export const ChaosEventSchema = z.object({
  type: z.enum(['KILL_NODE', 'THROTTLE_NODE', 'NETWORK_PARTITION', 'QUEUE_BACKUP', 'CACHE_EVICTION']),
  targetNodeId: z.string().min(1),
  durationSeconds: z.number().int().min(1).max(300).default(10),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

// ── Save a new simulation config ─────────────────────────────────────────
export const SaveSimConfigBody = z.object({
  designId: z.string().cuid(),
  config: z.object({
    targetQps: z.number().min(1).max(1_000_000),
    pattern: z.enum(['CONSTANT', 'SPIKE', 'RAMP']),
    chaosEvents: z.array(ChaosEventSchema).max(10).optional(),
    nodeOverrides: z.record(z.object({
      capacity: z.number().optional(),
      latency: z.number().optional(),
      hitRate: z.number().min(0).max(1).optional(),
    }).optional()).optional(),
  }),
});

// ── Save metrics from a completed simulation run ─────────────────────────
export const SaveSimRunBody = z.object({
  simulationId: z.string().cuid(),
  durationSec: z.number().int().min(0),
  metrics: z.array(z.object({
    tick: z.number().int(),
    timestamp: z.number(),
    nodes: z.array(z.object({
      id: z.string(),
      qps: z.number(),
      errorRate: z.number(),
      p99Latency: z.number(),
      cpu: z.number().optional(),
      queueDepth: z.number().optional(),
    })),
    systemHealth: z.enum(['GREEN', 'YELLOW', 'RED']),
  })),
  events: z.array(z.object({
    tick: z.number(),
    type: z.string(),
    message: z.string(),
    severity: z.enum(['INFO', 'WARNING', 'ERROR']),
  })).optional(),
});

// ── Chaos injection ──────────────────────────────────────────────────────
export const ChaosInjectBody = z.object({
  nodeId: z.string().min(1),
  mode: z.enum(['KILL', 'THROTTLE', 'PARTITION', 'CACHE_EVICTION']),
  severity: z.number().min(0).max(1).optional(),
});

// ── Query params for listing runs ────────────────────────────────────────
export const ListRunsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  designId: z.string().cuid().optional(),
});

// ── Progress update during client-side simulation sync ────────────────────
export const UpdateRunProgressBody = z.object({
  tick: z.record(z.unknown()).optional(),
});
