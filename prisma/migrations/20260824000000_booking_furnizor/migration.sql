-- Furnizor / agenție parteneră pe Booking (ex. "autocar.md"). 100% aditiv —
-- coloană nullable, rândurile existente rămân neschimbate (null = client direct).
-- Idempotent (IF NOT EXISTS) fiindcă baza e partajată cu davo-operatori.

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "furnizor" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_furnizor_idx" ON "Booking"("furnizor");
