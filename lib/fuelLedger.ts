import type { Prisma } from "@prisma/client";
import { replayFifo, type FifoResult } from "@/lib/fuelFifo";

// Partea de server a rezervorului de motorină. Stocul și costul fiecărei
// alimentări/pierderi NU se mai calculează incremental, ci se derivă mereu din
// istoric (FIFO, vezi lib/fuelFifo.ts) — așa o ștergere sau o corectură de preț
// pe un lot vechi se propagă corect în toate operațiile de după.

export const TANK_ID = "1";
export const DEFAULT_CAPACITY = 9000;

// Opțiuni pentru tranzacțiile care rejoacă istoricul (pot actualiza multe rânduri).
export const LEDGER_TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

// Asigură singleton-ul și îl blochează până la finalul tranzacției, ca două
// operații simultane să nu citească același stoc (fără „lost update").
export async function lockTank(tx: Prisma.TransactionClient) {
  await tx.fuelTank.upsert({
    where: { id: TANK_ID },
    update: {},
    create: { id: TANK_ID, capacity: DEFAULT_CAPACITY, liters: 0 },
  });
  await tx.$queryRaw`SELECT "id" FROM "FuelTank" WHERE "id" = ${TANK_ID} FOR UPDATE`;
  return tx.fuelTank.findUniqueOrThrow({ where: { id: TANK_ID } });
}

export async function loadLedger(client: Pick<Prisma.TransactionClient, "fuelEntry">) {
  return client.fuelEntry.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, kind: true, liters: true, pricePerLiter: true, balanceAfter: true, createdAt: true },
  });
}

const differs = (a: number | null, b: number | null) =>
  a === null || b === null ? a !== b : Math.abs(a - b) > 1e-9;

// Rejoacă tot istoricul și scrie în DB doar ce s-a schimbat: stocul după
// fiecare operație, prețul FIFO al ieșirilor și stocul rezervorului.
// Aruncă FifoError (→ rollback) dacă istoricul ar duce stocul sub 0.
export async function syncFuelLedger(tx: Prisma.TransactionClient): Promise<FifoResult> {
  const entries = await loadLedger(tx);
  const result = replayFifo(entries);

  for (const e of entries) {
    const r = result.byId.get(e.id);
    if (!r) continue; // tip necunoscut — nu-l atingem
    const data: { balanceAfter?: number; pricePerLiter?: number | null } = {};
    if (differs(e.balanceAfter, r.balanceAfter)) data.balanceAfter = r.balanceAfter;
    // La refill prețul e input-ul utilizatorului; doar la ieșiri e derivat.
    if (e.kind !== "refill" && differs(e.pricePerLiter, r.pricePerLiter)) data.pricePerLiter = r.pricePerLiter;
    if (Object.keys(data).length > 0) await tx.fuelEntry.update({ where: { id: e.id }, data });
  }

  await tx.fuelTank.update({ where: { id: TANK_ID }, data: { liters: result.balance } });
  return result;
}
