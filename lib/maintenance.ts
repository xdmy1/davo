// Logica de evidență a mentenanței: calculează starea fiecărui „punct" (ulei,
// filtre, ITP, ...) pe baza odometrului LIVE din Gelios și/sau a datei ultimei
// efectuări. Întoarce verde / galben (în curând) / roșu (depășit) + explicație.

export type MaintStatus = "ok" | "soon" | "overdue" | "unknown";

const SEVERITY: Record<MaintStatus, number> = { overdue: 3, soon: 2, ok: 1, unknown: 0 };

export type MaintItemInput = {
  id: string;
  geliosUnitId: number;
  vehicleName: string;
  type: string;
  intervalKm: number | null;
  intervalDays: number | null;
  lastServiceKm: number | null;
  lastServiceAt: string | Date;
  notes: string | null;
  active: boolean;
};

export type MaintComputed = MaintItemInput & {
  currentKm: number | null;
  // km
  kmSince: number | null;
  kmRemaining: number | null;
  kmStatus: MaintStatus;
  // timp
  daysSince: number | null;
  daysRemaining: number | null;
  daysStatus: MaintStatus;
  // agregat
  status: MaintStatus;
  progressPct: number; // 0..100+ pentru bara colorată (după intervalul dominant)
  label: string; // "OK" | "În curând" | "Depășit" | "Nespecificat"
  reason: string; // explicație scurtă, ex: "Depășit cu 1.240 km"
};

const DAY_MS = 24 * 60 * 60 * 1000;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmtKm = (n: number) => Math.round(n).toLocaleString("ro-RO");

function kmBranch(intervalKm: number, since: number) {
  const remaining = intervalKm - since;
  const soonAt = clamp(intervalKm * 0.1, 500, 3000); // galben în ultimii ~10% (500–3000 km)
  const status: MaintStatus = remaining <= 0 ? "overdue" : remaining <= soonAt ? "soon" : "ok";
  const reason =
    remaining <= 0 ? `Depășit cu ${fmtKm(-remaining)} km` : `Mai ai ${fmtKm(remaining)} km`;
  return { remaining, status, reason, pct: (since / intervalKm) * 100 };
}

function daysBranch(intervalDays: number, since: number) {
  const remaining = intervalDays - since;
  const soonAt = clamp(intervalDays * 0.1, 7, 45); // galben în ultimele ~10% (7–45 zile)
  const status: MaintStatus = remaining <= 0 ? "overdue" : remaining <= soonAt ? "soon" : "ok";
  const reason =
    remaining <= 0
      ? `Expirat de ${-remaining} zile`
      : `Valabil încă ${remaining} ${remaining === 1 ? "zi" : "zile"}`;
  return { remaining, status, reason, pct: (since / intervalDays) * 100 };
}

export function computeMaintenance(
  item: MaintItemInput,
  currentKm: number | null,
  nowMs: number
): MaintComputed {
  const lastAt = new Date(item.lastServiceAt).getTime();
  const daysSince = Number.isFinite(lastAt) ? Math.max(0, Math.floor((nowMs - lastAt) / DAY_MS)) : null;

  // Ramura km
  let kmSince: number | null = null;
  let kmRemaining: number | null = null;
  let kmStatus: MaintStatus = "unknown";
  let kmReason = "";
  let kmPct = 0;
  if (item.intervalKm && item.intervalKm > 0) {
    if (currentKm !== null && item.lastServiceKm !== null) {
      kmSince = Math.max(0, currentKm - item.lastServiceKm);
      const b = kmBranch(item.intervalKm, kmSince);
      kmRemaining = b.remaining;
      kmStatus = b.status;
      kmReason = b.reason;
      kmPct = b.pct;
    } else {
      kmStatus = "unknown";
      kmReason = currentKm === null ? "Fără odometru din Gelios" : "Fără km la ultima efectuare";
    }
  }

  // Ramura timp
  let daysRemaining: number | null = null;
  let daysStatus: MaintStatus = "unknown";
  let daysReason = "";
  let daysPct = 0;
  if (item.intervalDays && item.intervalDays > 0 && daysSince !== null) {
    const b = daysBranch(item.intervalDays, daysSince);
    daysRemaining = b.remaining;
    daysStatus = b.status;
    daysReason = b.reason;
    daysPct = b.pct;
  }

  // Agregat: ramura cea mai severă decide starea, culoarea barei și explicația.
  const branches: { status: MaintStatus; reason: string; pct: number }[] = [];
  if (item.intervalKm) branches.push({ status: kmStatus, reason: kmReason, pct: kmPct });
  if (item.intervalDays) branches.push({ status: daysStatus, reason: daysReason, pct: daysPct });

  let status: MaintStatus = "unknown";
  let reason = "Fără interval setat";
  let progressPct = 0;
  if (branches.length) {
    const dominant = branches.reduce((a, b) => (SEVERITY[b.status] > SEVERITY[a.status] ? b : a));
    status = dominant.status;
    reason = dominant.reason;
    progressPct = clamp(Math.round(dominant.pct), 0, 100);
  }

  const label =
    status === "overdue" ? "Depășit" : status === "soon" ? "În curând" : status === "ok" ? "OK" : "Nespecificat";

  return {
    ...item,
    currentKm,
    kmSince,
    kmRemaining,
    kmStatus,
    daysSince,
    daysRemaining,
    daysStatus,
    status,
    progressPct,
    label,
    reason,
  };
}

// Sortare pentru afișare: cele mai urgente sus.
export function maintSeverity(status: MaintStatus): number {
  return SEVERITY[status];
}

// Preseturi inteligente pentru autobuze (heavy-duty). Intervale orientative,
// editabile la adăugare. km pentru mecanice/consumabile, zile pentru documente.
export type MaintPreset = { type: string; intervalKm?: number; intervalDays?: number };
export const MAINT_PRESETS: MaintPreset[] = [
  { type: "Ulei motor + filtru ulei", intervalKm: 30000 },
  { type: "Filtru aer", intervalKm: 45000 },
  { type: "Filtru combustibil", intervalKm: 60000 },
  { type: "Filtru habitaclu (polen)", intervalKm: 30000 },
  { type: "Ulei cutie de viteze", intervalKm: 120000 },
  { type: "Lichid de răcire (antigel)", intervalKm: 120000 },
  { type: "Plăcuțe frână față", intervalKm: 60000 },
  { type: "Plăcuțe frână spate", intervalKm: 80000 },
  { type: "Lichid de frână", intervalDays: 730 },
  { type: "Curea/lanț distribuție", intervalKm: 150000 },
  { type: "Anvelope", intervalKm: 60000 },
  { type: "Revizie tehnică (ITP)", intervalDays: 365 },
  { type: "Asigurare RCA", intervalDays: 365 },
  { type: "Verificare tahograf", intervalDays: 730 },
];
