/**
 * apps/backend/src/modules/designs/designs.schema.ts
 *
 * Zod schemas for the Build canvas API.
 *
 * ReactFlow node/edge JSON is intentionally typed loosely (z.any()) here
 * because the exact shape is owned by the frontend canvas library.
 * The DB stores it as Prisma Json — we only validate the container shape.
 */

import { z } from 'zod';

// ── Metadata-only update (title, description, visibility) ─────────────────────
export const UpdateDesignMetaBody = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isPublic:    z.boolean().optional(),
});

// ── Save a new version snapshot ───────────────────────────────────────────────
export const SaveDesignBody = z.object({
  nodes:   z.array(z.any()),          // ReactFlow Node[]
  edges:   z.array(z.any()),          // ReactFlow Edge[]
  message: z.string().max(200).optional(), // optional commit message
});

// ── Create a new design (optionally from a template) ─────────────────────────
export const CreateDesignBody = z.object({
  title:      z.string().min(1).max(200).default('Untitled Design'),
  templateId: z.string().cuid().optional(),
});

// ── Restore a specific version ────────────────────────────────────────────────
export const RestoreVersionBody = z.object({
  version: z.number().int().min(1),
});
