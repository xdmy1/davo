-- Evidență mentenanță autobuze — DOAR tabele noi (aditiv, non-destructiv).
-- (Nu includem drift-ul raportat de `migrate diff` față de coloane/indexuri
--  adăugate direct în DB de panoul operatorilor — acelea rămân neatinse.)

-- CreateTable
CREATE TABLE "MaintenanceItem" (
    "id" TEXT NOT NULL,
    "geliosUnitId" INTEGER NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "intervalKm" INTEGER,
    "intervalDays" INTEGER,
    "lastServiceKm" DOUBLE PRECISION,
    "lastServiceAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "serviceKm" DOUBLE PRECISION,
    "serviceAt" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceItem_geliosUnitId_idx" ON "MaintenanceItem"("geliosUnitId");

-- CreateIndex
CREATE INDEX "MaintenanceItem_active_idx" ON "MaintenanceItem"("active");

-- CreateIndex
CREATE INDEX "MaintenanceLog_itemId_idx" ON "MaintenanceLog"("itemId");

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaintenanceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
