import { db } from '../client';

export const lessonsRepo = {
  async listTracks() {
    return db.track.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' }
    });
  },

  async findTrackBySlug(slug: string) {
    return db.track.findFirst({
      where: { slug, isPublished: true },
      include: {
        modules: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });
  },

  async findBySlug(slug: string) {
    return db.lesson.findFirst({
      where: { slug, isPublished: true },
      include: {
        quizzes: {
          include: { questions: { orderBy: { order: 'asc' } } }
        }
      }
    });
  },

  async findWithModule(slug: string) {
    return db.lesson.findFirst({
      where: { slug, isPublished: true },
      include: {
        module: {
          include: {
            track: true
          }
        },
        quizzes: {
          include: { questions: { orderBy: { order: 'asc' } } }
        }
      }
    });
  },

  async search(query: string, filters?: { difficulty?: string; tags?: string[] }, includePremium = true) {
    const whereClause: any = {
      isPublished: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (filters?.difficulty) {
      whereClause.difficulty = filters.difficulty;
    }

    if (!includePremium) {
      whereClause.isPremium = false;
    }

    if (filters?.tags && filters.tags.length > 0) {
      whereClause.tags = { hasSome: filters.tags };
    }

    return db.lesson.findMany({
      where: whereClause,
      include: {
        module: {
          include: {
            track: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });
  },

  async getQuizzesByLesson(lessonId: string) {
    return db.quiz.findMany({
      where: { lessonId },
      include: { questions: { orderBy: { order: 'asc' } } }
    });
  },

  async saveQuizAttempt(data: { userId: string; quizId: string; score: number; answers: any; passed: boolean }) {
    return db.quizAttempt.create({
      data: {
        userId: data.userId,
        quizId: data.quizId,
        score: data.score,
        answers: data.answers,
        passed: data.passed
      }
    });
  },

  async getQuizAttempts(userId: string, quizId: string) {
    return db.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { completedAt: 'desc' }
    });
  }
};
