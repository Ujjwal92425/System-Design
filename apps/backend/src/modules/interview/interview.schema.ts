import { z } from 'zod';

export const StartSessionBody = z.object({
  promptId: z.string().cuid('Invalid prompt ID'),
});

export const LinkDesignBody = z.object({
  designId: z.string().cuid('Invalid design ID'),
});

export const SubmitSessionBody = z.object({
  design: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
});