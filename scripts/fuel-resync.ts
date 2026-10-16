// Recalculează registrul de motorină din istoric (FIFO): stocul după fiecare
// operație, costul fiecărei alimentări/pierderi și stocul rezervorului.
// Același calcul pe care îl face API-ul la fiecare scriere — scriptul e pentru
// verificare sau pentru reparat datele după o intervenție manuală în DB.
//
//   npx tsx scripts/fuel-resync.ts          → doar arată diferențele
//   npx tsx scripts/fuel-resync.ts --apply  → le și scrie
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { replayFifo } from "../lib/fuelFifo";
import { LEDGER_TX_OPTIONS, TANK_ID, loadLedger, lockTank, syncFuelLedger } from "../lib/fuelLedger";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const [tank, entries] = await Promise.all([prisma.fuelTank.findUnique({ where: { id: TANK_ID } }), loadLedger(prisma)]);
  const fifo = replayFifo(entries);

  let changes = 0;
  for (const e of entries) {
    const r = fifo.byId.get(e.id);
    if (!r) continue;
    const priceChanged = e.kind !== "refill" && (e.pricePerLiter ?? null) !== (r.pricePerLiter ?? null);
    const balanceChanged = e.balanceAfter !== r.balanceAfter;
    if (!priceChanged && !balanceChanged) continue;
    changes++;
    console.log(
      `${e.createdAt.toISOString()} ${e.kind.padEnd(8)} ${String(e.liters).padStart(7)} l | ` +
        `preț ${e.pricePerLiter ?? "—"} → ${r.pricePerLiter ?? "—"} | sold ${e.balanceAfter} → ${r.balanceAfter}`
    );
  }
  console.log(`\nStoc rezervor: ${tank?.liters ?? 0} → ${fifo.balance} l`);
  console.log("Loturi rămase:", fifo.lots.map((l) => `${l.liters} l × ${l.pricePerLiter ?? "fără preț"}`).join(" | ") || "—");
  console.log(`${changes} operații de corectat.`);

  if (!apply) {
    console.log("\n(doar simulare — rulează cu --apply ca să scrii)");
    return;
  }
  await prisma.$transaction(async (tx) => {
    await lockTank(tx);
    await syncFuelLedger(tx);
  }, LEDGER_TX_OPTIONS);
  console.log("Scris în baza de date.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
