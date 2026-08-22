-- RedefineTables
-- isActive(Boolean) 대신 status(SOURCING/ACTIVE/ENDED)로 바꾼다.
-- 기존 값 보존: isActive=true였던 상품은 ACTIVE로, false였던 상품은 ENDED로 옮긴다.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "imageUrl" TEXT,
    "images" TEXT,
    "retailPrice" INTEGER,
    "supplyPrice" INTEGER,
    "commissionRate" REAL,
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SOURCING',
    "vendorCompany" TEXT,
    "vendorContact" TEXT,
    "vendorPhone" TEXT,
    "vendorEmail" TEXT,
    "shippingFee" TEXT,
    "returnPolicy" TEXT,
    "asInfo" TEXT,
    "settlementSchedule" TEXT,
    "origin" TEXT,
    "composition" TEXT,
    "material" TEXT,
    "sizeWeight" TEXT,
    "noticeExtra" TEXT,
    "proposalFileUrl" TEXT,
    "proposalFileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("id", "name", "brand", "imageUrl", "images", "retailPrice", "supplyPrice", "commissionRate", "memo", "status", "vendorCompany", "vendorContact", "vendorPhone", "vendorEmail", "shippingFee", "returnPolicy", "asInfo", "settlementSchedule", "origin", "composition", "material", "sizeWeight", "noticeExtra", "proposalFileUrl", "proposalFileName", "createdAt", "updatedAt")
SELECT "id", "name", "brand", "imageUrl", "images", "retailPrice", "supplyPrice", "commissionRate", "memo",
    CASE WHEN "isActive" = 1 THEN 'ACTIVE' ELSE 'ENDED' END,
    "vendorCompany", "vendorContact", "vendorPhone", "vendorEmail", "shippingFee", "returnPolicy", "asInfo", "settlementSchedule", "origin", "composition", "material", "sizeWeight", "noticeExtra", "proposalFileUrl", "proposalFileName", "createdAt", "updatedAt"
FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
