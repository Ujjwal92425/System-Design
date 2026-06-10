import { lessonsRepo, progressRepo, db } from '@sd-os/db';
import { LessonStatus } from '@prisma/client';
import { AppError } from '../../utils/errors';

export const learnService = {
  /**
   * List all published tracks along with user progress metrics.
   */
  async listTracks(userId: string) {
    const tracks = await lessonsRepo.listTracks();
    const progressList = await db.userProgress.findMany({
      where: { userId }
    });

    const progressMap = new Map(progressList.map(p => [p.trackId, p.completedPct]));

    return tracks.map(track => ({
      ...track,
      completedPct: progressMap.get(track.id) || 0
    }));
  },

  /**
   * Get track details by slug, including nested modules and lessons with completed states.
   */
  async getTrackDetail(slug: string, userId: string) {
    const track = await lessonsRepo.findTrackBySlug(slug);
    if (!track) {
      throw new AppError('NOT_FOUND', 'Track not found', 404);
    }

    // Fetch user progress for this track
    const userProgress = await progressRepo.getTrackProgress(userId, track.id);
    
    // Fetch all lesson states for this user in this track
    const states = await db.lessonState.findMany({
      where: {
        userId,
        lesson: {
          module: {
            trackId: track.id
          }
        }
      }
    });

    const stateMap = new Map(states.map(s => [s.lessonId, s.status]));

    const modulesWithProgress = track.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(lesson => ({
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
   */
  async getLessonDetail(slug: string, userId: string) {
    const lesson = await lessonsRepo.findWithModule(slug);
    if (!lesson) {
      throw new AppError('NOT_FOUND', 'Lesson not found', 404);
    }

    // Fetch or create lesson state for this user
    const lessonState = await db.lessonState.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } }
    });

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
  async searchLessons(query: string, filters?: { difficulty?: string; tags?: string[] }) {
    return lessonsRepo.search(query, filters);
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
