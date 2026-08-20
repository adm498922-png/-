-- AlterTable
ALTER TABLE "Creator" ADD COLUMN "isBusiness" BOOLEAN;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "unitsSold" INTEGER,
    "revenue" INTEGER,
    "commissionRate" REAL,
    "salesCommission" INTEGER,
    "contentFee" INTEGER,
    "settlement" INTEGER,
    "agencyRate" REAL,
    "agencyFee" INTEGER,
    "settleDueDate" DATETIME,
    "settledAt" DATETIME,
    "linkSent" BOOLEAN NOT NULL DEFAULT false,
    "taxReported" BOOLEAN NOT NULL DEFAULT false,
    "statementIssued" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deal" ("createdAt", "creatorId", "endDate", "id", "memo", "productId", "productName", "revenue", "settlement", "startDate", "status", "unitsSold", "updatedAt") SELECT "createdAt", "creatorId", "endDate", "id", "memo", "productId", "productName", "revenue", "settlement", "startDate", "status", "unitsSold", "updatedAt" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
CREATE INDEX "Deal_creatorId_idx" ON "Deal"("creatorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
