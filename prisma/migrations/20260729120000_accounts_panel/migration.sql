-- Panou „Conturi & Acces". 100% aditiv — nimic existent nu se modifică sau redenumește.
-- Coloanele noi au DEFAULT, deci INSERT-urile existente (davo și davo-operatori) merg neschimbate.
-- Scris idempotent (IF NOT EXISTS) fiindcă baza e partajată de două repo-uri și
-- migrarea poate ajunge de două ori pe același Postgres.

-- AlterTable AdminUser (aditiv)
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable Operator (aditiv)
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountAudit" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT NOT NULL,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountAudit_createdAt_idx" ON "AccountAudit"("createdAt");
