import { db } from '../client';

export const lessonsRepo = {
  async findBySlug(slug: string) {
    return db.lesson.findUnique({
      where: { slug },
      include: { quizzes: { include: { questions: true } } }
    });
  },

  async search(query: string) {
    return db.lesson.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      }
    });
  }
};
