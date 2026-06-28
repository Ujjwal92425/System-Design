import { db } from '../client';

export const blueprintsRepo = {
  async listPublished(opts: { page: number; limit: number; sort?: string; topic?: string; difficulty?: string; search?: string }) {
    const { page, limit, sort, topic, difficulty, search } = opts;
    const skip = (page - 1) * limit;
    const where: any = { isPublished: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (topic) where.tags = { has: topic };
    if (difficulty) where.tags = { has: difficulty };

    const orderBy: any = sort === 'top' ? { voteCount: 'desc' } : sort === 'oldest' ? { publishedAt: 'asc' } : { publishedAt: 'desc' };

    const [items, total] = await Promise.all([
      db.blueprint.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
      }),
      db.blueprint.count({ where }),
    ]);
    return { blueprints: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  async findById(id: string) {
    return db.blueprint.findUnique({
      where: { id },
      include: {
        design: { include: { versions: { orderBy: { version: 'desc' }, take: 1 } } },
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { comments: true, votes: true } },
      },
    });
  },

  async create(data: {
    designId: string; authorId: string; title: string; description: string; tags: string[]; mediaUrls?: string[];
  }) {
    return db.blueprint.create({
      data: {
        designId: data.designId,
        authorId: data.authorId,
        title: data.title,
        description: data.description,
        tags: data.tags,
        mediaUrls: data.mediaUrls ?? [],
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  },

  async update(id: string, userId: string, data: { title?: string; description?: string; tags?: string[] }) {
    const bp = await db.blueprint.findFirst({ where: { id, authorId: userId } });
    if (!bp) throw new Error('Blueprint not found or access denied');
    return db.blueprint.update({ where: { id }, data });
  },

  async softDelete(id: string, userId: string) {
    const bp = await db.blueprint.findFirst({ where: { id, authorId: userId } });
    if (!bp) throw new Error('Blueprint not found or access denied');
    return db.blueprint.update({ where: { id }, data: { isPublished: false } });
  },

  async incrementView(id: string) {
    return db.blueprint.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  },

  async incrementForkCount(id: string) {
    return db.blueprint.update({ where: { id }, data: { forkCount: { increment: 1 } } });
  },

  async incrementCommentCount(id: string) {
    return db.blueprint.update({ where: { id }, data: { commentCount: { increment: 1 } } });
  },

  async decrementCommentCount(id: string) {
    return db.blueprint.update({ where: { id }, data: { commentCount: { decrement: 1 } } });
  },

  async listByAuthor(authorId: string) {
    return db.blueprint.findMany({
      where: { authorId, isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
  },

  async updateVoteCount(id: string) {
    const aggregate = await db.vote.aggregate({ where: { blueprintId: id }, _sum: { value: true } });
    const total = aggregate._sum.value || 0;
    return db.blueprint.update({ where: { id }, data: { voteCount: total } });
  },

  async unpublish(id: string) {
    return db.blueprint.update({ where: { id }, data: { isPublished: false } });
  },

  async hardDelete(id: string) {
    return db.blueprint.delete({ where: { id } });
  },
};
