-- DropIndex
DROP INDEX "Lesson_isPublished_idx";

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Lesson_isPublished_isPremium_idx" ON "Lesson"("isPublished", "isPremium");
