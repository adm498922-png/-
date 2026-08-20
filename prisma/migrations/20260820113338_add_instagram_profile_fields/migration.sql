-- AlterTable
ALTER TABLE "Creator" ADD COLUMN "avgComments" INTEGER;
ALTER TABLE "Creator" ADD COLUMN "avgLikes" INTEGER;
ALTER TABLE "Creator" ADD COLUMN "bio" TEXT;
ALTER TABLE "Creator" ADD COLUMN "engagementRate" REAL;
ALTER TABLE "Creator" ADD COLUMN "igUserId" TEXT;
ALTER TABLE "Creator" ADD COLUMN "postCount" INTEGER;
ALTER TABLE "Creator" ADD COLUMN "profileImageUrl" TEXT;
ALTER TABLE "Creator" ADD COLUMN "syncedAt" DATETIME;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "igAccessTokenEnc" TEXT;
ALTER TABLE "Settings" ADD COLUMN "igBusinessAccountId" TEXT;
