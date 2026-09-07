-- Configurare orașe din admin (davo.md/admin/orase): traducere RU, ordine,
-- activ/ascuns, offset pentru orar și țările destinație pentru care un oraș MD
-- se oferă pasagerilor. 100% aditiv — rândurile existente rămân neschimbate.
-- Idempotent (IF NOT EXISTS) fiindcă baza e partajată cu davo-operatori.

ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "nameRu" TEXT;
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "pickupOffsetMin" INTEGER;
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "passengerCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "City_active_idx" ON "City"("active");
