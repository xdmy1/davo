-- Rezervor motorină (pagină admin-only). 100% aditiv — două tabele noi,
-- nimic existent nu se modifică. Idempotent (IF NOT EXISTS) ca restul migrărilor.

-- CreateTable: singleton-ul rezervorului
CREATE TABLE IF NOT EXISTS "FuelTank" (
    "id" TEXT NOT NULL DEFAULT '1',
    "capacity" DOUBLE PRECISION NOT NULL DEFAULT 9000,
    "liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuelTank_pkey" PRIMARY KEY ("id")
);

-- Seed singleton-ul (capacitate 9000 l, stoc 0) dacă nu există deja.
INSERT INTO "FuelTank" ("id", "capacity", "liters", "createdAt", "updatedAt")
VALUES ('1', 9000, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateTable: istoricul operațiilor
CREATE TABLE IF NOT EXISTS "FuelEntry" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "plate" TEXT,
    "vehicle" TEXT,
    "notes" TEXT,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuelEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FuelEntry_createdAt_idx" ON "FuelEntry"("createdAt");
CREATE INDEX IF NOT EXISTS "FuelEntry_kind_idx" ON "FuelEntry"("kind");
