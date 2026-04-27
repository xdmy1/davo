-- CreateIndex
CREATE INDEX "Trip_routeId_status_departureAt_idx" ON "Trip"("routeId", "status", "departureAt");
