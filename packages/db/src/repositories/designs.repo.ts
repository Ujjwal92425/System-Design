import { db } from '../client';

export const designsRepo = {
  async findById(id: string) {
    return db.design.findFirst({
      where: { id, deletedAt: null },
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
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async create(userId: string, data: { title?: string; description?: string; templateId?: string; forkedFromId?: string }) {
    return db.design.create({
      data: {
        userId,
        title: data.title || 'Untitled Design',
        description: data.description,
        templateId: data.templateId,
        forkedFromId: data.forkedFromId
      }
    });
  },

  async updateMetadata(id: string, data: { title?: string; description?: string; isPublic?: boolean }) {
    return db.design.update({
      where: { id },
      data
    });
  },

  async save(designId: string, data: { nodes: any[]; edges: any[]; message?: string }) {
    return db.$transaction(async (tx) => {
      const latestVersion = await tx.designVersion.findFirst({
        where: { designId },
        orderBy: { version: 'desc' }
      });

      const nextVer = (latestVersion?.version || 0) + 1;

      // Update parent Design updated time
      const design = await tx.design.update({
        where: { id: designId },
        data: { updatedAt: new Date() }
      });

      // Create new snapshot version
      const version = await tx.designVersion.create({
        data: {
          designId,
          version: nextVer,
          nodes: data.nodes as any,
          edges: data.edges as any,
          message: data.message || `Autosave version ${nextVer}`
        }
      });

      return { design, version };
    });
  },

  async getVersions(designId: string, limit = 20) {
    return db.designVersion.findMany({
      where: { designId },
      orderBy: { version: 'desc' },
      take: limit
    });
  },

  async restoreVersion(designId: string, versionNumber: number) {
    return db.$transaction(async (tx) => {
      const targetVersion = await tx.designVersion.findUnique({
        where: {
          designId_version: { designId, version: versionNumber }
        }
      });

      if (!targetVersion) {
        throw new Error(`Version ${versionNumber} not found for design ${designId}`);
      }

      const latestVersion = await tx.designVersion.findFirst({
        where: { designId },
        orderBy: { version: 'desc' }
      });

      const nextVer = (latestVersion?.version || 0) + 1;

      // Update current state and save as a new restored version
      await tx.design.update({
        where: { id: designId },
        data: { updatedAt: new Date() }
      });

      return tx.designVersion.create({
        data: {
          designId,
          version: nextVer,
          nodes: targetVersion.nodes as any,
          edges: targetVersion.edges as any,
          message: `Restored to version ${versionNumber}`
        }
      });
    });
  },

  async fork(designId: string, userId: string) {
    const original = await this.findById(designId);
    if (!original) {
      throw new Error(`Design ${designId} not found or deleted.`);
    }

    const latestVersion = original.versions[0];
    if (!latestVersion) {
      throw new Error(`Design ${designId} has no saved version to fork.`);
    }

    return db.$transaction(async (tx) => {
      const forked = await tx.design.create({
        data: {
          userId,
          title: `Fork of ${original.title}`,
          description: original.description,
          forkedFromId: original.id
        }
      });

      await tx.designVersion.create({
        data: {
          designId: forked.id,
          version: 1,
          nodes: latestVersion.nodes as any,
          edges: latestVersion.edges as any,
          message: `Initial version forked from ${original.title}`
        }
      });

      return forked;
    });
  },

  async softDelete(id: string) {
    return db.design.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
};
