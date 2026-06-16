import { db } from '../client';

export const commentsRepo = {
  async findByBlueprint(blueprintId: string) {
    return db.comment.findMany({
      where: { blueprintId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  },

  async create(data: { blueprintId: string; userId: string; content: string; parentId?: string }) {
    return db.comment.create({ data });
  },

  async softDelete(id: string, userId: string) {
    const c = await db.comment.findFirst({ where: { id, userId } });
    if (!c) throw new Error('Comment not found or access denied');
    return db.comment.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async update(id: string, userId: string, content: string) {
    const c = await db.comment.findFirst({ where: { id, userId, deletedAt: null } });
    if (!c) throw new Error('Comment not found or access denied');
    return db.comment.update({ where: { id }, data: { content } });
  },
};
