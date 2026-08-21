-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'AD',
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "desc" TEXT,
    "microTarget" INTEGER,
    "macroTarget" INTEGER,
    "megaTarget" INTEGER,
    "budget" INTEGER,
    "period" TEXT,
    "productShip" BOOLEAN,
    "secondaryUse" BOOLEAN,
    "salePrice" INTEGER,
    "listPrice" INTEGER,
    "commissionRate" REAL,
    "targetQty" INTEGER,
    "collabStart" DATETIME,
    "collabEnd" DATETIME,
    "promo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignAssignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DmTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CampaignAssignment_campaignId_idx" ON "CampaignAssignment"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_creatorId_idx" ON "CampaignAssignment"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAssignment_campaignId_creatorId_key" ON "CampaignAssignment"("campaignId", "creatorId");
