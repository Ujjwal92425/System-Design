-- AlterTable
ALTER TABLE "Blueprint" ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mediaUrls" TEXT[];
