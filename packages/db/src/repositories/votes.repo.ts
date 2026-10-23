import { Prisma } from '@prisma/client';
import { db } from '../client';

export const votesRepo = {
  async cast(blueprintId: string, userId: string, value: number) {
    return db.$transaction(async (tx) => {
      // Vote changes and the denormalized count must move together. Locking
      // the parent blueprint also serializes simultaneous toggles by one user.
      const [blueprint] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM "Blueprint"
        WHERE "id" = ${blueprintId} AND "isPublished" = true
        FOR UPDATE
      `);
      if (!blueprint) return null;

      const existing = await tx.vote.findUnique({
        where: { blueprintId_userId: { blueprintId, userId } },
      });

      let action: 'created' | 'updated' | 'removed';
      if (existing?.value === value) {
        await tx.vote.delete({ where: { id: existing.id } });
        action = 'removed';
      } else if (existing) {
        await tx.vote.update({ where: { id: existing.id }, data: { value } });
        action = 'updated';
      } else {
        await tx.vote.create({ data: { blueprintId, userId, value } });
        action = 'created';
      }

      const aggregate = await tx.vote.aggregate({
        where: { blueprintId },
        _sum: { value: true },
      });
      const netVotes = aggregate._sum.value ?? 0;
      await tx.blueprint.update({
        where: { id: blueprintId },
        data: { voteCount: netVotes },
      });

      return { action, netVotes };
    });
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
