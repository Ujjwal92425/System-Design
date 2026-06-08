import { z } from 'zod';
import { NodeType } from '../enums/node-types.enum';

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const NodeDataSchema = z.record(z.any());

export const DesignNodeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(NodeType),
  position: PositionSchema,
  data: NodeDataSchema,
});

export const DesignEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  protocol: z.enum(['sync', 'async']).optional(),
});

export const SaveDesignSchema = z.object({
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
  message: z.string().optional(),
});
