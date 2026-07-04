/**
 * apps/backend/src/modules/admin/admin.schema.ts
 *
 * Zod validation schemas for all admin-only write operations.
 *
 * Security: Admin routes are protected by authorize(['ADMIN']) on the router.
 * Zod ensures we reject malformed payloads before they reach the service layer.
 */

import { z } from 'zod';

// ── Track schemas ─────────────────────────────────────────────────────────────

export const CreateTrackBody = z.object({
  slug:           z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  name:           z.string().min(2).max(120),
  description:    z.string().min(10).max(1000),
  level:          z.number().int().min(1).max(5),
  order:          z.number().int().min(1),
  estimatedHours: z.number().int().min(1).optional(),
  learningGoals:  z.array(z.string()).min(1).max(10),
  isPublished:    z.boolean().default(false),
});

export const UpdateTrackBody = CreateTrackBody.partial();

// ── Module schemas ────────────────────────────────────────────────────────────

export const CreateModuleBody = z.object({
  trackId:      z.string().cuid(),
  name:         z.string().min(2).max(120),
  description:  z.string().min(2).max(500),
  order:        z.number().int().min(1),
  estimatedMin: z.number().int().min(1),
  isPublished:  z.boolean().default(false),
});

export const UpdateModuleBody = CreateModuleBody.partial().omit({ trackId: true });

// ── Lesson schemas ────────────────────────────────────────────────────────────

export const CreateLessonBody = z.object({
  moduleId:     z.string().cuid(),
  slug:         z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  title:        z.string().min(2).max(200),
  content:      z.string().min(1),   // MDX source
  order:        z.number().int().min(1),
  estimatedMin: z.number().int().min(1),
  difficulty:   z.enum(['beginner', 'intermediate', 'advanced']),
  companies:    z.array(z.string()).default([]),
  tags:         z.array(z.string()).default([]),
  isPublished:  z.boolean().default(false),
});

export const UpdateLessonBody = CreateLessonBody.partial().omit({ moduleId: true });

// ── Quiz + Question schemas ───────────────────────────────────────────────────

export const CreateQuizBody = z.object({
  lessonId:     z.string().cuid(),
  title:        z.string().min(2).max(200),
  passingScore: z.number().int().min(1).max(100).default(70),
  isRequired:   z.boolean().default(false),
});

export const CreateQuestionBody = z.object({
  quizId:        z.string().cuid(),
  type:          z.enum(['multiple_choice', 'true_false']),
  content:       z.string().min(4),
  options:       z.array(z.string()).min(2).max(6),
  correctAnswer: z.string().min(1),
  explanation:   z.string().min(4),
  order:         z.number().int().min(1),
});

export const UpdateQuestionBody = CreateQuestionBody.partial().omit({ quizId: true });

// ── User management schemas ─────────────────────────────────────────────────

export const AdminUpdateUserBody = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['USER', 'PRO', 'INSTRUCTOR', 'ADMIN']).optional(),
  emailVerified: z.boolean().optional(),
});

export const AdminCreateUserBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['USER', 'PRO', 'INSTRUCTOR', 'ADMIN']).default('USER'),
});

export const AdminImportUsersBody = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1).max(120).optional(),
    role: z.enum(['USER', 'PRO', 'INSTRUCTOR', 'ADMIN']).default('USER'),
  })).min(1).max(1000),
});

// ── Blueprint moderation schemas ──────────────────────────────────────────────

export const AdminCreateBlueprintBody = z.object({
  designId:    z.string().cuid(),
  title:       z.string().min(2).max(120),
  description: z.string().min(10).max(2000),
  tags:        z.array(z.string()).max(10).default([]),
  mediaUrls:   z.array(z.string().url()).max(5).optional(),
  authorId:    z.string().cuid().optional(), // defaults to admin's own id
});

export const FeatureBlueprintBody = z.object({
  featured: z.boolean(),
});

export const ReviewReportBody = z.object({
  status: z.enum(['reviewed', 'dismissed']),
});

export const SuspendUserBody = z.object({
  durationMin: z.number().int().min(1).max(10080).default(1440), // max 7 days
});
