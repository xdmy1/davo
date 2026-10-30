-- Numerele de înmatriculare ale rezervorului, editabile din admin (până acum o listă fixă în cod).
CREATE TABLE "FuelPlate" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuelPlate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FuelPlate_plate_key" ON "FuelPlate"("plate");

INSERT INTO "FuelPlate" ("id", "plate") VALUES
  (gen_random_uuid()::text, 'QQS 979'),
  (gen_random_uuid()::text, 'OKK 525'),
  (gen_random_uuid()::text, 'TUR 999'),
  (gen_random_uuid()::text, 'LOK 889'),
  (gen_random_uuid()::text, 'VXU 828'),
  (gen_random_uuid()::text, 'LCX 593'),
  (gen_random_uuid()::text, 'ZNQ 874'),
  (gen_random_uuid()::text, 'NVP 821'),
  (gen_random_uuid()::text, 'DAV 077'),
  (gen_random_uuid()::text, 'DAW 077'),
  (gen_random_uuid()::text, 'INS 840'),
  (gen_random_uuid()::text, 'MIY 525'),
  (gen_random_uuid()::text, 'DAW 777'),
  (gen_random_uuid()::text, 'NUX 023'),
  (gen_random_uuid()::text, 'BMB 993'),
  (gen_random_uuid()::text, 'AVD 092');
