-- Split cost service în manoperă + piese (aditiv, non-destructiv).
ALTER TABLE "MaintenanceLog" ADD COLUMN "laborCost" DOUBLE PRECISION;
ALTER TABLE "MaintenanceLog" ADD COLUMN "partsCost" DOUBLE PRECISION;
