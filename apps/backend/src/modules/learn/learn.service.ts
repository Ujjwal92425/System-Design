import { lessonsRepo, progressRepo, db } from '@sd-os/db';
import { LessonStatus, Role } from '@prisma/client';
import { AppError } from '../../utils/errors';

const PRO_LOCKED_MESSAGE =
  'This lesson requires a PRO subscription. Upgrade to unlock advanced content.';

/**
 * Check whether a user can access premium content.
 * Returns true if the user is ADMIN, PRO role, or has an active PRO/TEAM subscription.
 */
async function hasPremiumAccess(userId: string, role: string): Promise<boolean> {
  if (role === Role.ADMIN || role === Role.INSTRUCTOR || role === Role.PRO) return true;

  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  return subscription?.status === 'ACTIVE'
    && (subscription.plan === 'PRO' || subscription.plan === 'TEAM');
}

/**
 * Strip premium-only fields and add an isLocked flag for non-PRO users.
 */
function maskPremiumLesson(lesson: any) {
  const { content, quizzes, ...rest } = lesson;
  return {
    ...rest,
    content: null,
    quizzes: [],
    isLocked: true,
    lockedMessage: PRO_LOCKED_MESSAGE,
  };
}

/** Never send answers to the browser until the attempt has been graded. */
function withoutQuizAnswers(quizzes: any[]) {
  return quizzes.map(({ questions, ...quiz }) => ({
    ...quiz,
    questions: questions.map(({ correctAnswer, ...question }: any) => question),
  }));
}

export const learnService = {
  /**
   * List all published tracks along with user progress metrics.
   * All tracks are visible (premium tracks show "PRO" badge on frontend).
   */
  // CHANGE: Support optional userId for guest/unauthenticated browsing
  async listTracks(userId?: string) {
    const tracks = await lessonsRepo.listTracks();
    const progressList = userId ? await db.userProgress.findMany({
      where: { userId }
    }) : [];

    const progressMap = new Map(progressList.map(p => [p.trackId, p.completedPct]));

    return tracks.map(track => ({
      ...track,
      completedPct: progressMap.get(track.id) || 0
    }));
  },

  /**
   * Get track details by slug, including nested modules and lessons with completed states.
   * Premium lessons are filtered out for free users.
   */
  // CHANGE: Support optional userId for guest/unauthenticated browsing
  async getTrackDetail(slug: string, userId?: string) {
    const track = await lessonsRepo.findTrackBySlug(slug);
    if (!track) {
      throw new AppError('NOT_FOUND', 'Track not found', 404);
    }

    // Fetch user progress for this track
    const userProgress = userId ? await progressRepo.getTrackProgress(userId, track.id) : null;
    
    // Fetch all lesson states for this user in this track
    const states = userId ? await db.lessonState.findMany({
      where: {
        userId,
        lesson: {
          module: {
            trackId: track.id
          }
        }
      }
    }) : [];

    const stateMap = new Map(states.map(s => [s.lessonId, s.status]));

    const modulesWithProgress = track.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons
        .map(lesson => ({
          ...lesson,
          status: stateMap.get(lesson.id) || LessonStatus.NOT_STARTED
        }))
    }));

    return {
      ...track,
      modules: modulesWithProgress,
      completedPct: userProgress?.completedPct || 0
    };
  },

  /**
   * Get a single lesson by slug, including bookmark/progress states and siblings navigation.
   * Premium lessons return redacted content for non-PRO users (isLocked: true).
   */
  // CHANGE: Support optional userId for guest/unauthenticated browsing
  async getLessonDetail(slug: string, userId?: string) {
    const lesson = await lessonsRepo.findWithModule(slug);
    if (!lesson) {
      throw new AppError('NOT_FOUND', 'Lesson not found', 404);
    }

    // Check premium access
    const user = userId ? await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    }) : null;

    const hasAccess = userId ? await hasPremiumAccess(userId, user?.role ?? 'USER') : false;

    // If the lesson is premium and user doesn't have access, return masked version
    if (lesson.isPremium && !hasAccess) {
      return maskPremiumLesson({
        ...lesson,
        module: lesson.module,
        quizzes: lesson.quizzes,
      });
    }

    // Fetch or create lesson state for this user
    const lessonState = userId ? await db.lessonState.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } }
    }) : null;

    // Calculate siblings (Next/Prev) inside the same track
    const trackId = lesson.module.trackId;
    const siblingLessons = await db.lesson.findMany({
      where: {
        isPublished: true,
        module: {
          trackId,
          isPublished: true
        }
      },
      orderBy: [
        { module: { order: 'asc' } },
        { order: 'asc' }
      ],
      select: { slug: true, title: true }
    });

    const currentIndex = siblingLessons.findIndex(l => l.slug === slug);
    const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;

    return {
      ...lesson,
      quizzes: withoutQuizAnswers(lesson.quizzes),
      userState: {
        status: lessonState?.status || LessonStatus.NOT_STARTED,
        bookmarked: lessonState?.bookmarked || false,
        notes: lessonState?.notes || null,
        resumeState: lessonState?.resumeState || null
      },
      navigation: {
        prev: prevLesson,
        next: nextLesson
      }
    };
  },

  /**
   * Search through lessons content and titles using full-text filtering.
   */
  // CHANGE: Support optional userId for guest/unauthenticated browsing
  async searchLessons(userId: string | undefined, query: string, filters?: { difficulty?: string; tags?: string[] }) {
    const user = userId ? await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }) : null;
    const includePremium = userId ? await hasPremiumAccess(userId, user?.role ?? 'USER') : false;
    return lessonsRepo.search(query, filters, includePremium);
  },

  /**
   * Toggle a lesson's bookmark state for a user.
   */
  async toggleBookmark(userId: string, lessonId: string, bookmarked: boolean) {
    return progressRepo.toggleBookmark(userId, lessonId, bookmarked);
  },

  /**
   * Update reading progress, notes, or completion state for a lesson.
   */
  async updateLessonState(
    userId: string,
    lessonId: string,
    data: { status?: LessonStatus; resumeState?: any; notes?: string }
  ) {
    // Increment streak if starting or completing activity
    if (data.status) {
      await progressRepo.updateStreak(userId);
    }
    return progressRepo.upsertLessonState(userId, lessonId, data);
  },

  /**
   * Evaluate a quiz submission, save attempt history, and auto-complete the lesson on success.
   */
  async submitQuizAttempt(
    userId: string,
    quizId: string,
    answers: Record<string, string>
  ) {
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true, lesson: true }
    });

    if (!quiz) {
      throw new AppError('NOT_FOUND', 'Quiz not found', 404);
    }
    if (!quiz.lesson.isPublished) {
      throw new AppError('NOT_FOUND', 'Quiz not found', 404);
    }
    if (quiz.lesson.isPremium) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!await hasPremiumAccess(userId, user?.role ?? 'USER')) {
        throw new AppError('FORBIDDEN', PRO_LOCKED_MESSAGE, 403);
      }
    }

    let correctCount = 0;
    const totalCount = quiz.questions.length;

    if (totalCount === 0) {
      throw new AppError('BAD_REQUEST', 'Quiz has no questions configured', 400);
    }

    const questionResults = quiz.questions.map(q => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    const score = (correctCount / totalCount) * 100;
    const passed = score >= quiz.passingScore;

    // Save attempt log
    await lessonsRepo.saveQuizAttempt({
      userId,
      quizId,
      score,
      answers,
      passed
    });

    // If passed, auto-complete the lesson status
    if (passed) {
      await progressRepo.upsertLessonState(userId, quiz.lessonId, {
        status: LessonStatus.COMPLETE
      });
      await progressRepo.updateStreak(userId);
    }

    return {
      score,
      passed,
      passingScore: quiz.passingScore,
      questions: questionResults
    };
  }
};
