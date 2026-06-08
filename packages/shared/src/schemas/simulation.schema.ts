import { z } from 'zod';

export const ChaosEventSchema = z.object({
  type: z.enum(['KILL_NODE', 'THROTTLE_NODE', 'NETWORK_PARTITION']),
  targetNodeId: z.string(),
  durationSeconds: z.number().default(10),
});

export const SimConfigSchema = z.object({
  targetQps: z.number().min(1),
  pattern: z.enum(['CONSTANT', 'SPIKE', 'RAMP']),
  chaosEvents: z.array(ChaosEventSchema).optional(),
});
