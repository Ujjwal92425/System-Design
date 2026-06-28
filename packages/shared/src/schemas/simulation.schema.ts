import { z } from 'zod';

export const ChaosEventSchema = z.object({
  type: z.enum(['KILL_NODE', 'THROTTLE_NODE', 'NETWORK_PARTITION', 'QUEUE_BACKUP', 'CACHE_EVICTION']),
  targetNodeId: z.string().min(1),
  durationSeconds: z.number().int().min(1).max(300).default(10),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const SimConfigSchema = z.object({
  targetQps: z.number().min(1),
  pattern: z.enum(['CONSTANT', 'SPIKE', 'RAMP']),
  chaosEvents: z.array(ChaosEventSchema).optional(),
});
