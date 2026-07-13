-- Preț de achiziție per litru la reumplerea rezervorului. Aditiv, nullable —
-- rândurile existente rămân neatinse (pot primi prețul ulterior).

ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "pricePerLiter" DOUBLE PRECISION;
