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
    return db.$transaction(async (tx) => {
      const comment = await tx.comment.create({ data });
      await tx.blueprint.update({
        where: { id: data.blueprintId },
        data: { commentCount: { increment: 1 } },
      });
      return comment;
    });
  },

  async softDelete(id: string, userId: string) {
    return db.$transaction(async (tx) => {
      const c = await tx.comment.findFirst({ where: { id, userId, deletedAt: null } });
      if (!c) throw new Error('Comment not found or access denied');

      const comment = await tx.comment.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.blueprint.update({
        where: { id: comment.blueprintId },
        data: { commentCount: { decrement: 1 } },
      });
      return comment;
    });
  },

  async update(id: string, userId: string, content: string) {
    const c = await db.comment.findFirst({ where: { id, userId, deletedAt: null } });
    if (!c) throw new Error('Comment not found or access denied');
    return db.comment.update({ where: { id }, data: { content } });
  },

  async adminDelete(id: string) {
    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) throw new Error('Comment not found');
    await db.comment.delete({ where: { id } });
    await db.blueprint.update({
      where: { id: comment.blueprintId },
      data: { commentCount: { decrement: 1 } },
    });
    return comment;
  },
};
