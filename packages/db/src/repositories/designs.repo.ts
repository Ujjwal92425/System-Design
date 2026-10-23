/**
 * packages/db/src/repositories/designs.repo.ts
 *
 * All database queries for the Design canvas module.
 *
 * Design decisions:
 *  - Versions are append-only (no updates). Each save creates a new version row.
 *  - `listByUser` excludes soft-deleted designs (deletedAt IS NULL).
 *  - `save()` creates a new DesignVersion and atomically updates Design.updatedAt.
 *  - `restore()` creates a new version row (copies nodes/edges from an old one)
 *    rather than mutating the old version — versions are immutable history.
 *  - `findPublic()` bypasses user auth — used by the public shareable link route.
 */

import { Prisma } from '@prisma/client';
import { db } from '../client';

type DesignDbClient = Pick<Prisma.TransactionClient, 'design' | 'designVersion' | 'template'>;

export const designsRepo = {

  /** List the authenticated user's non-deleted designs, newest first */
  async listByUser(userId: string) {
    return db.design.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, description: true, isPublic: true,
        thumbnailUrl: true, createdAt: true, updatedAt: true,
        // Most recent version to show node count in the list card
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { version: true, nodes: true },
        },
      },
    });
  },

  /** Get a design with all its version history (for the editor + version panel) */
  async findById(id: string, userId: string) {
    return db.design.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, message: true, createdAt: true },
        },
      },
    });
  },

  /**
   * Get a specific version's node/edge data.
   * Called when the editor loads the latest version or when restoring.
   */
  async findVersion(designId: string, version?: number) {
    if (version !== undefined) {
      return db.designVersion.findUnique({
        where: { designId_version: { designId, version } },
      });
    }
    // Default: return the latest version
    return db.designVersion.findFirst({
      where: { designId },
      orderBy: { version: 'desc' },
    });
  },

  /** Get a public design (no userId check) — used by the public shareable link */
  async findPublic(id: string) {
    return db.design.findFirst({
      where: { id, isPublic: true, deletedAt: null },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
  },

  /** Create a new blank design (optionally pre-populated from a template) */
  async create(
    userId: string,
    title: string,
    templateId?: string,
    nodes?: any[],
    edges?: any[],
    client: DesignDbClient = db,
  ) {
    // Directly-provided nodes/edges take priority (e.g. from SCENARIO_TEMPLATES on the frontend)
    let initNodes = nodes ?? [];
    let initEdges = edges ?? [];

    if (!initNodes.length && templateId) {
      const template = await client.template.findFirst({
        where: { id: templateId, isPublished: true },
        select: { nodes: true, edges: true },
      });
      if (template) {
        initNodes = template.nodes as any[];
        initEdges = template.edges as any[];
      }
    }

    return client.design.create({
      data: {
        userId,
        title,
        templateId: templateId || null,
        versions: {
          create: { version: 1, nodes: initNodes, edges: initEdges, message: 'Initial save' },
        },
      },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
  },

  /**
   * Save a new version snapshot.
   * Uses an atomic transaction to:
   *   1. Determine the next version number
   *   2. Create the DesignVersion row
   *   3. Touch Design.updatedAt
   */
  async save(
    id: string,
    userId: string,
    data: { nodes: any[]; edges: any[]; message?: string }
  ) {
    return db.$transaction(async (tx) => {
      // Lock the parent row before computing the next version. This serializes
      // concurrent autosaves so the unique (designId, version) constraint is
      // never hit and no snapshot is lost.
      const [design] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM "Design"
        WHERE "id" = ${id}
          AND "userId" = ${userId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      if (!design) throw new Error('Design not found or access denied');

      // Determine next version number
      const latest = await tx.designVersion.findFirst({
        where: { designId: id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      // Create the immutable version snapshot
      const version = await tx.designVersion.create({
        data: {
          designId: id,
          version: nextVersion,
          nodes: data.nodes,
          edges: data.edges,
          message: data.message,
        },
      });

      // Touch the parent design so the list view sorts correctly
      await tx.design.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      return version;
    });
  },

  /** Update design metadata (title, description, visibility) */
  async updateMeta(
    id: string,
    userId: string,
    data: { title?: string; description?: string; isPublic?: boolean; thumbnailUrl?: string }
  ) {
    // Ownership check
    const design = await db.design.findFirst({ where: { id, userId, deletedAt: null } });
    if (!design) throw new Error('Design not found or access denied');

    return db.design.update({ where: { id }, data });
  },

  /**
   * Restore a design to a specific version.
   * Creates a new version row (copy of the old one) — history is never mutated.
   */
  async restore(id: string, userId: string, targetVersion: number) {
    return db.$transaction(async (tx) => {
      // The same parent-row lock used by save() makes restore safe when an
      // autosave or another restore is happening at the same time.
      const [design] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM "Design"
        WHERE "id" = ${id}
          AND "userId" = ${userId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      if (!design) throw new Error('Design not found or access denied');

      const old = await tx.designVersion.findUnique({
        where: { designId_version: { designId: id, version: targetVersion } },
      });
      if (!old) throw new Error(`Version ${targetVersion} not found`);

      const latest = await tx.designVersion.findFirst({
        where: { designId: id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const version = await tx.designVersion.create({
        data: {
          designId: id,
          version: (latest?.version ?? 0) + 1,
          nodes: old.nodes as any[],
          edges: old.edges as any[],
          message: `Restored from v${targetVersion}`,
        },
      });

      await tx.design.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      return version;
    });
  },

  /** Soft-delete a design (sets deletedAt, data preserved for 30 days) */
  async softDelete(id: string, userId: string) {
    const design = await db.design.findFirst({ where: { id, userId, deletedAt: null } });
    if (!design) throw new Error('Design not found or access denied');

    return db.design.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
