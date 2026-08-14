-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "coupangAccessKeyEnc" TEXT,
    "coupangSecretKeyEnc" TEXT,
    "threadsAppId" TEXT,
    "threadsAppSecretEnc" TEXT,
    "threadsRedirectUri" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ThreadsAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "username" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CoupangLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT,
    "originalUrl" TEXT NOT NULL,
    "shortUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "commentBody" TEXT,
    "coupangLinkId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_coupangLinkId_fkey" FOREIGN KEY ("coupangLinkId") REFERENCES "CoupangLink" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "threadsAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "threadsMediaId" TEXT,
    "threadsPermalink" TEXT,
    "commentMediaId" TEXT,
    "errorMessage" TEXT,
    "publishedAt" DATETIME,
    CONSTRAINT "PostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostTarget_threadsAccountId_fkey" FOREIGN KEY ("threadsAccountId") REFERENCES "ThreadsAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postTargetId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "quotes" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostStat_postTargetId_fkey" FOREIGN KEY ("postTargetId") REFERENCES "PostTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsAccount_threadsUserId_key" ON "ThreadsAccount"("threadsUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTarget_postId_threadsAccountId_key" ON "PostTarget"("postId", "threadsAccountId");

-- CreateIndex
CREATE INDEX "PostStat_postTargetId_capturedAt_idx" ON "PostStat"("postTargetId", "capturedAt");
