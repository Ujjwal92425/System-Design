import { db } from '../client';

export const collectionsRepo = {
  async listByUser(userId: string) {
    return db.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  },

  async findById(id: string, userId: string) {
    return db.collection.findFirst({
      where: { id, userId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            blueprint: {
              select: { id: true, title: true, description: true, tags: true, voteCount: true, publishedAt: true, author: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
    });
  },

  async create(data: { userId: string; name: string; description?: string; isPublic?: boolean }) {
    return db.collection.create({ data });
  },

  async update(id: string, userId: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    const col = await db.collection.findFirst({ where: { id, userId } });
    if (!col) throw new Error('Collection not found');
    return db.collection.update({ where: { id }, data });
  },

  async delete(id: string, userId: string) {
    const col = await db.collection.findFirst({ where: { id, userId } });
    if (!col) throw new Error('Collection not found');
    return db.collection.delete({ where: { id } });
  },

  async addItem(collectionId: string, blueprintId: string, order: number = 0) {
    return db.collectionItem.create({ data: { collectionId, blueprintId, order } });
  },

  async removeItem(collectionId: string, blueprintId: string) {
    return db.collectionItem.deleteMany({
      where: { collectionId, blueprintId },
    });
  },

  async reorderItems(collectionId: string, itemIds: string[]) {
    await db.$transaction(
      itemIds.map((id, idx) =>
        db.collectionItem.update({ where: { id }, data: { order: idx } })
      )
    );
  },
};
