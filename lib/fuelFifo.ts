// Evaluarea motorinei din rezervor pe principiul FIFO: litrii intrați primii
// ies primii. O alimentare consumă întâi din cel mai vechi lot rămas și abia
// apoi trece la următorul — deci 1000 l rămași la prețul vechi se decontează la
// prețul vechi chiar dacă între timp s-a adăugat un lot nou, mai scump.
//
// Modul pur (fără Prisma) — îl folosesc și API-ul (sursa de adevăr) și pagina
// de admin (previzualizarea costului), ca să nu existe două calcule diferite.
// Calculul se face în centilitri întregi ca să nu apară erori de rotunjire la
// scăderi repetate de zecimale.

export type FuelKind = "refill" | "dispense" | "loss";

export type FuelLedgerEntry = {
  id: string;
  kind: string;
  liters: number;
  pricePerLiter: number | null; // la refill = prețul de achiziție (input)
  createdAt: Date | string;
};

export type FifoLot = {
  refillId: string;
  createdAt: string;
  liters: number; // litri rămași din lot
  pricePerLiter: number | null;
};

export type FifoSlice = { refillId: string; liters: number; pricePerLiter: number | null };

export type FifoOutflow = {
  slices: FifoSlice[];
  cost: number | null; // null dacă o parte vine dintr-un lot fără preț
  pricePerLiter: number | null; // medie ponderată = cost / litri
};

export type FifoResult = {
  balance: number;
  lots: FifoLot[];
  // Pe fiecare intrare: stocul după operație și, la ieșiri, costul FIFO.
  byId: Map<string, { balanceAfter: number; pricePerLiter: number | null; slices: FifoSlice[] | null }>;
};

export class FifoError extends Error {
  constructor(
    message: string,
    public entryId?: string,
  ) {
    super(message);
    this.name = "FifoError";
  }
}

type CentiLot = { refillId: string; createdAt: string; cl: number; pricePerLiter: number | null };

const toCl = (liters: number) => Math.round(liters * 100);
const fromCl = (cl: number) => cl / 100;
const roundMoney = (n: number) => Math.round(n * 100) / 100;
// Prețul mediu se păstrează cu 6 zecimale ca litri × preț să redea costul exact.
const roundPrice = (n: number) => Math.round(n * 1e6) / 1e6;

const isOutflow = (kind: string) => kind === "dispense" || kind === "loss";

export function sortLedger<T extends FuelLedgerEntry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return t !== 0 ? t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// Scoate `cl` centilitri din loturi (FIFO), mutând loturile. Presupune stoc suficient.
function consume(lots: CentiLot[], cl: number): FifoOutflow {
  const slices: FifoSlice[] = [];
  let left = cl;
  let costCl = 0; // Σ cl × preț (lei × 100)
  let unpriced = false;
  while (left > 0 && lots.length > 0) {
    const lot = lots[0];
    const take = Math.min(left, lot.cl);
    slices.push({ refillId: lot.refillId, liters: fromCl(take), pricePerLiter: lot.pricePerLiter });
    if (lot.pricePerLiter === null) unpriced = true;
    else costCl += take * lot.pricePerLiter;
    lot.cl -= take;
    left -= take;
    if (lot.cl === 0) lots.shift();
  }
  if (unpriced || cl === 0) return { slices, cost: null, pricePerLiter: null };
  const cost = costCl / 100;
  return { slices, cost: roundMoney(cost), pricePerLiter: roundPrice(cost / fromCl(cl)) };
}

// Rejoacă tot istoricul în ordine cronologică. Aruncă FifoError dacă o ieșire
// depășește stocul de la momentul ei (ex. s-a șters o reumplere deja consumată).
export function replayFifo(entries: FuelLedgerEntry[]): FifoResult {
  const lots: CentiLot[] = [];
  const byId: FifoResult["byId"] = new Map();
  let balanceCl = 0;

  for (const e of sortLedger(entries)) {
    const cl = toCl(e.liters);
    const at = new Date(e.createdAt).toISOString();
    const when = new Date(e.createdAt).toLocaleString("ro-RO", {
      timeZone: "Europe/Chisinau",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (e.kind === "refill") {
      if (cl > 0) lots.push({ refillId: e.id, createdAt: at, cl, pricePerLiter: e.pricePerLiter ?? null });
      balanceCl += cl;
      byId.set(e.id, { balanceAfter: fromCl(balanceCl), pricePerLiter: e.pricePerLiter ?? null, slices: null });
    } else if (isOutflow(e.kind)) {
      if (cl > balanceCl) {
        throw new FifoError(
          `la operația din ${when} în rezervor ar fi doar ${fromCl(balanceCl)} l, dar se scot ${fromCl(cl)} l`,
          e.id,
        );
      }
      const out = consume(lots, cl);
      balanceCl -= cl;
      byId.set(e.id, { balanceAfter: fromCl(balanceCl), pricePerLiter: out.pricePerLiter, slices: out.slices });
    }
  }

  return {
    balance: fromCl(balanceCl),
    lots: lots.map((l) => ({ refillId: l.refillId, createdAt: l.createdAt, liters: fromCl(l.cl), pricePerLiter: l.pricePerLiter })),
    byId,
  };
}

// Previzualizare: cât ar costa `liters` scoși acum din loturile rămase (nu le modifică).
export function previewOutflow(lots: FifoLot[], liters: number): FifoOutflow | null {
  const cl = toCl(liters);
  const available = lots.reduce((s, l) => s + toCl(l.liters), 0);
  if (!(cl > 0) || cl > available) return null;
  const copy: CentiLot[] = lots.map((l) => ({ refillId: l.refillId, createdAt: l.createdAt, cl: toCl(l.liters), pricePerLiter: l.pricePerLiter }));
  return consume(copy, cl);
}
