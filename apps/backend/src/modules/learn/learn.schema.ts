import { z } from 'zod';
import { LessonStatus } from '@prisma/client';

export const LessonStateBody = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  status: z.nativeEnum(LessonStatus).optional(),
  resumeState: z.any().optional(),
  notes: z.string().optional(),
});

export const BookmarkBody = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  bookmarked: z.boolean(),
});

export const QuizAttemptBody = z.object({
  answers: z.record(z.string(), z.string()),
});
