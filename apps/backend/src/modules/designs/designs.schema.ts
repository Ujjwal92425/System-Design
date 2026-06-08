import { z } from 'zod';
export const SaveDesignBody = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any())
});
