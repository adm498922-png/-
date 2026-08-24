-- CreateTable
CREATE TABLE "SettlementNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT,
    "memo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SettlementNote_date_idx" ON "SettlementNote"("date");
