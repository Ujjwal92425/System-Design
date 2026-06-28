import { db } from '../client';

export const reportsRepo = {
  async create(data: { blueprintId: string; reporterId: string; reason: string }) {
    return db.report.create({ data });
  },

  async listPending() {
    return db.report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        blueprint: { select: { id: true, title: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async review(id: string, status: 'reviewed' | 'dismissed') {
    return db.report.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
    });
  },

  async countPending() {
    return db.report.count({ where: { status: 'pending' } });
  },

  async countPendingForBlueprint(blueprintId: string) {
    return db.report.count({ where: { blueprintId, status: 'pending' } });
  },
};
