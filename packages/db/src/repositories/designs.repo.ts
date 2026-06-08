import { db } from '../client';
import { DesignDocument, DesignNode, DesignEdge } from '@sd-os/shared';

export const designsRepo = {
  async findById(id: string) {
    return db.design.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });
  },

  async listByUser(userId: string) {
    return db.design.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async save(designId: string, data: { nodes: DesignNode[]; edges: DesignEdge[]; message?: string }) {
    const latestVersion = await db.designVersion.findFirst({
      where: { designId },
      orderBy: { version: 'desc' }
    });

    const nextVer = (latestVersion?.version || 0) + 1;

    return db.$transaction([
      db.design.update({
        where: { id: designId },
        data: { updatedAt: new Date() }
      }),
      db.designVersion.create({
        data: {
          designId,
          version: nextVer,
          nodes: JSON.stringify(data.nodes),
          edges: JSON.stringify(data.edges),
          message: data.message || `Version ${nextVer}`
        }
      })
    ]);
  }
};
