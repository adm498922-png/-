-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "briefingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "briefingGmailUser" TEXT;
ALTER TABLE "Settings" ADD COLUMN "briefingGmailPassEnc" TEXT;
ALTER TABLE "Settings" ADD COLUMN "briefingTo" TEXT;
