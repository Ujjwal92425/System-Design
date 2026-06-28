import { z } from 'zod';

export const UploadMediaSchema = z.object({
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  fileSize: z.number().max(5 * 1024 * 1024),
});

export const CreateBlueprintBody = z.object({
  designId: z.string().cuid(),
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(2000),
  tags: z.array(z.string()).max(10).default([]),
  mediaUrls: z.array(z.string().url()).max(5).optional(),
});

export const UpdateBlueprintBody = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(10).max(2000).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const CreateCommentBody = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().cuid().optional(),
});

export const UpdateCommentBody = z.object({
  content: z.string().min(1).max(5000),
});

export const VoteBody = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export const CreateCollectionBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const UpdateCollectionBody = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export const ReportBlueprintBody = z.object({
  reason: z.string().min(4).max(1000),
});

export const AddToCollectionBody = z.object({
  collectionId: z.string().cuid(),
});

export const BlueprintQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['newest', 'top', 'oldest']).default('newest'),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  search: z.string().optional(),
});
