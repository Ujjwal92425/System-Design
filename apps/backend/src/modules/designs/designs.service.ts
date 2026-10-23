/**
 * apps/backend/src/modules/designs/designs.service.ts
 *
 * Business logic layer for the Build canvas module.
 *
 * Plan limits enforced here (not in the router):
 *  - FREE users: max 3 designs
 *  - PRO  users: unlimited
 * This keeps the router thin and the limit logic testable in isolation.
 */

import { Prisma } from '@prisma/client';
import { db, designsRepo } from '@sd-os/db';
import { AppError } from '../../utils/errors';

/** Per-plan design creation limits */
const PLAN_LIMITS = {
  USER: 2,
  PRO:  Infinity,
  ADMIN: Infinity,
  INSTRUCTOR: Infinity,
} as const;

export const designsService = {

  async listDesigns(userId: string) {
    return designsRepo.listByUser(userId);
  },

  async listTemplates() {
    return db.template.findMany({
      where: { isPublished: true },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get a design's full state for the canvas editor.
   * Returns the design metadata + the latest (or specified) version snapshot.
   *
   * Security: ownership is verified inside designsRepo.findById.
   */
  async getDesignForEditor(id: string, userId: string) {
    const design = await designsRepo.findById(id, userId);
    if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);

    // Load the latest version's actual node/edge data
    const latestVersion = await designsRepo.findVersion(id);

    return { ...design, canvas: latestVersion };
  },

  /**
   * Create a new design, enforcing per-plan creation limits.
   *
   * @throws 402 if the user is on FREE and already at their limit
   */
  async createDesign(userId: string, role: string, title: string, templateId?: string, nodes?: any[], edges?: any[]) {
    const limit = PLAN_LIMITS[role as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.USER;

    if (limit !== Infinity) {
      return db.$transaction(async (tx) => {
        // Serialize quota checks per user. Without this lock, parallel create
        // requests can both observe an available slot and exceed the plan.
        await tx.$queryRaw(Prisma.sql`
          SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
        `);
        const count = await tx.design.count({ where: { userId, deletedAt: null } });
        if (count >= limit) {
          throw new AppError(
            'PLAN_LIMIT',
            `Free accounts can create up to ${limit} designs. Upgrade to Pro for unlimited designs.`,
            402
          );
        }

        return designsRepo.create(userId, title, templateId, nodes, edges, tx);
      });
    }

    return designsRepo.create(userId, title, templateId, nodes, edges);
  },

  /** Save a new version snapshot — ownership verified in repo */
  async saveDesign(
    id: string,
    userId: string,
    data: { nodes: any[]; edges: any[]; message?: string }
  ) {
    return designsRepo.save(id, userId, data);
  },

  /** Update title / description / visibility */
  async updateMeta(
    id: string,
    userId: string,
    data: { title?: string; description?: string; isPublic?: boolean }
  ) {
    return designsRepo.updateMeta(id, userId, data);
  },

  /** Restore design to a specific version number */
  async restoreVersion(id: string, userId: string, version: number) {
    const design = await designsRepo.findById(id, userId);
    if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);

    return designsRepo.restore(id, userId, version);
  },

  /** Soft-delete design (recoverable within 30 days) */
  async deleteDesign(id: string, userId: string) {
    const design = await designsRepo.findById(id, userId);
    if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);

    return designsRepo.softDelete(id, userId);
  },

  /**
   * Get a public design by ID — no auth required.
   * Returns 404 if the design is private or deleted.
   */
  async getPublicDesign(id: string) {
    const design = await designsRepo.findPublic(id);
    if (!design) throw new AppError('NOT_FOUND', 'Design not found or is private', 404);
    return design;
  },
};
