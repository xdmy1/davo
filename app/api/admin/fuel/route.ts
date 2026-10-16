import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/session";
import { replayFifo, FifoError } from "@/lib/fuelFifo";
import { TANK_ID, DEFAULT_CAPACITY, LEDGER_TX_OPTIONS, lockTank, loadLedger, syncFuelLedger } from "@/lib/fuelLedger";

export const dynamic = "force-dynamic";

// Numele adminului logat, pentru snapshot pe fiecare operație.
async function currentAdminName(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return null;
  const user = await prisma.adminUser.findUnique({
    where: { email: session.email },
    select: { name: true },
  });
  return user?.name ?? null;
}

export async function GET() {
  try {
    const tank = await prisma.fuelTank.upsert({
      where: { id: TANK_ID },
      update: {},
      create: { id: TANK_ID, capacity: DEFAULT_CAPACITY, liters: 0 },
    });
    const entries = await prisma.fuelEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Loturile rămase în rezervor (FIFO) + din ce loturi a venit fiecare ieșire.
    // Doar citire — valorile din DB sunt ținute la zi de syncFuelLedger la fiecare scriere.
    let lots: ReturnType<typeof replayFifo>["lots"] = [];
    let slicesById = new Map<string, { liters: number; pricePerLiter: number | null }[]>();
    try {
      const fifo = replayFifo(await loadLedger(prisma));
      lots = fifo.lots;
      slicesById = new Map(
        [...fifo.byId].flatMap(([id, r]) =>
          r.slices ? [[id, r.slices.map((s) => ({ liters: s.liters, pricePerLiter: s.pricePerLiter }))] as const] : []
        )
      );
    } catch (err) {
      console.error("admin/fuel GET replay", err);
    }

    // Sumar pentru luna curentă.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthEntries = await prisma.fuelEntry.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: { kind: true, liters: true },
    });
    const dispensedThisMonth = monthEntries
      .filter((e) => e.kind === "dispense")
      .reduce((s, e) => s + e.liters, 0);
    const refilledThisMonth = monthEntries
      .filter((e) => e.kind === "refill")
      .reduce((s, e) => s + e.liters, 0);

    // Total cheltuit (toate reumplerile cu preț setat): Σ litri × preț/litru.
    const pricedRefills = await prisma.fuelEntry.findMany({
      where: { kind: "refill", pricePerLiter: { not: null } },
      select: { liters: true, pricePerLiter: true },
    });
    const totalSpent = pricedRefills.reduce((s, e) => s + e.liters * (e.pricePerLiter ?? 0), 0);

    // Total pierdut (furt/lipsă), evaluat FIFO din loturile din care a ieșit.
    const losses = await prisma.fuelEntry.findMany({
      where: { kind: "loss" },
      select: { liters: true, pricePerLiter: true },
    });
    const lostLiters = losses.reduce((s, e) => s + e.liters, 0);
    const lostValue = losses.reduce((s, e) => s + e.liters * (e.pricePerLiter ?? 0), 0);

    // Valoarea motorinei rămase în rezervor (loturile cu preț).
    const stockValue = lots.reduce((s, l) => s + l.liters * (l.pricePerLiter ?? 0), 0);

    return NextResponse.json({
      success: true,
      tank: { capacity: tank.capacity, liters: tank.liters },
      entries: entries.map((e) => ({ ...e, slices: slicesById.get(e.id) ?? null })),
      lots,
      stats: {
        dispensedThisMonth,
        refilledThisMonth,
        opsThisMonth: monthEntries.length,
        totalSpent: round(totalSpent),
        lostLiters: round(lostLiters),
        lostValue: round(lostValue),
        stockValue: round(stockValue),
      },
    });
  } catch (error) {
    console.error("admin/fuel GET", error);
    return NextResponse.json({ success: false, error: "Failed to load fuel data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind: "refill" | "dispense" | "loss" =
      body?.kind === "refill" ? "refill" : body?.kind === "loss" ? "loss" : "dispense";
    const liters = round(Number(body?.liters));
    const priceRaw = Number(body?.pricePerLiter);
    const pricePerLiter = Number.isFinite(priceRaw) && priceRaw > 0 ? round(priceRaw) : null;
    const plate = typeof body?.plate === "string" ? body.plate.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    if (!Number.isFinite(liters) || liters <= 0) {
      return NextResponse.json({ success: false, error: "Numărul de litri trebuie să fie mai mare ca 0." }, { status: 400 });
    }
    // Fără prețul lotului, alimentările din el nu pot fi evaluate FIFO.
    if (kind === "refill" && pricePerLiter === null) {
      return NextResponse.json({ success: false, error: "Introdu prețul per litru al motorinei adăugate." }, { status: 400 });
    }

    const createdByName = await currentAdminName(req);

    const result = await prisma.$transaction(async (tx) => {
      const tank = await lockTank(tx);
      const ledger = await loadLedger(tx);
      const current = replayFifo(ledger).balance;

      if (kind === "refill") {
        if (current + liters > tank.capacity + 0.001) {
          throw new FifoError(
            `Depășește capacitatea rezervorului (${tank.capacity} l). Stoc curent: ${round(current)} l, spațiu liber: ${round(tank.capacity - current)} l.`
          );
        }
      } else if (liters > current + 0.001) {
        // dispense (alimentare vehicul) și loss (pierdere/lipsă) scad din stoc.
        throw new FifoError(`Stoc insuficient. În rezervor sunt ${round(current)} l, ai cerut ${round(liters)} l.`);
      }

      // Operația nouă e mereu ultima în istoric, chiar dacă ceasul serverului
      // ar fi cu câteva ms în urma celei precedente.
      const last = ledger[ledger.length - 1];
      const now = new Date();
      const createdAt = last && last.createdAt >= now ? new Date(last.createdAt.getTime() + 1) : now;

      const created = await tx.fuelEntry.create({
        data: {
          kind,
          liters,
          // refill: prețul de achiziție; dispense/loss: completat FIFO de syncFuelLedger.
          pricePerLiter: kind === "refill" ? pricePerLiter : null,
          plate: kind === "dispense" ? plate || null : null,
          notes: notes || null,
          balanceAfter: 0,
          createdByName,
          createdAt,
        },
      });

      const fifo = await syncFuelLedger(tx);
      const entry = await tx.fuelEntry.findUniqueOrThrow({ where: { id: created.id } });
      return { entry, liters: fifo.balance, capacity: tank.capacity };
    }, LEDGER_TX_OPTIONS);

    return NextResponse.json({
      success: true,
      entry: result.entry,
      tank: { capacity: result.capacity, liters: result.liters },
    });
  } catch (error) {
    const message = error instanceof FifoError ? error.message : "Eroare la înregistrare";
    console.error("admin/fuel POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
