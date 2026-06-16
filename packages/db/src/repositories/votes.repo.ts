import { db } from '../client';

export const votesRepo = {
  async upsert(blueprintId: string, userId: string, value: number) {
    const existing = await db.vote.findUnique({
      where: { blueprintId_userId: { blueprintId, userId } },
    });
    if (existing) {
      if (existing.value === value) {
        await db.vote.delete({ where: { id: existing.id } });
        return { action: 'removed' as const };
      }
      await db.vote.update({ where: { id: existing.id }, data: { value } });
      return { action: 'updated' as const };
    }
    await db.vote.create({ data: { blueprintId, userId, value } });
    return { action: 'created' as const };
  },

  async getUserVote(blueprintId: string, userId: string) {
    return db.vote.findUnique({
      where: { blueprintId_userId: { blueprintId, userId } },
    });
  },

  async getBlueprintVotes(blueprintId: string) {
    return db.vote.findMany({ where: { blueprintId } });
  },

  async getNetVotes(blueprintId: string) {
    const agg = await db.vote.aggregate({
      where: { blueprintId },
      _sum: { value: true },
    });
    return agg._sum.value || 0;
  },
};
