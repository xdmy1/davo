import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

const TANK_ID = "1";
const DEFAULT_CAPACITY = 9000;

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

// Asigură existența singleton-ului rezervorului (idempotent).
async function ensureTank() {
  return prisma.fuelTank.upsert({
    where: { id: TANK_ID },
    update: {},
    create: { id: TANK_ID, capacity: DEFAULT_CAPACITY, liters: 0 },
  });
}

export async function GET() {
  try {
    const tank = await ensureTank();
    const entries = await prisma.fuelEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

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

    return NextResponse.json({
      success: true,
      tank: { capacity: tank.capacity, liters: tank.liters },
      entries,
      stats: {
        dispensedThisMonth,
        refilledThisMonth,
        opsThisMonth: monthEntries.length,
        totalSpent: round(totalSpent),
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
    const kind = body?.kind === "refill" ? "refill" : "dispense";
    const liters = Number(body?.liters);
    const priceRaw = Number(body?.pricePerLiter);
    const pricePerLiter = Number.isFinite(priceRaw) && priceRaw > 0 ? round(priceRaw) : null;
    const plate = typeof body?.plate === "string" ? body.plate.trim() : "";
    const vehicle = typeof body?.vehicle === "string" ? body.vehicle.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    if (!Number.isFinite(liters) || liters <= 0) {
      return NextResponse.json({ success: false, error: "Numărul de litri trebuie să fie mai mare ca 0." }, { status: 400 });
    }

    const createdByName = await currentAdminName(req);

    const result = await prisma.$transaction(async (tx) => {
      const tank = await tx.fuelTank.upsert({
        where: { id: TANK_ID },
        update: {},
        create: { id: TANK_ID, capacity: DEFAULT_CAPACITY, liters: 0 },
      });

      let nextLiters: number;
      if (kind === "refill") {
        nextLiters = tank.liters + liters;
        if (nextLiters > tank.capacity + 0.001) {
          throw new Error(
            `Depășește capacitatea rezervorului (${tank.capacity} l). Stoc curent: ${round(tank.liters)} l, spațiu liber: ${round(tank.capacity - tank.liters)} l.`
          );
        }
      } else {
        if (liters > tank.liters + 0.001) {
          throw new Error(
            `Stoc insuficient. În rezervor sunt ${round(tank.liters)} l, ai cerut ${round(liters)} l.`
          );
        }
        nextLiters = tank.liters - liters;
      }
      nextLiters = round(nextLiters);

      const entry = await tx.fuelEntry.create({
        data: {
          kind,
          liters: round(liters),
          pricePerLiter: kind === "refill" ? pricePerLiter : null,
          plate: kind === "dispense" ? plate || null : null,
          vehicle: kind === "dispense" ? vehicle || null : null,
          notes: notes || null,
          balanceAfter: nextLiters,
          createdByName,
        },
      });

      await tx.fuelTank.update({
        where: { id: TANK_ID },
        data: { liters: nextLiters },
      });

      return { entry, liters: nextLiters, capacity: tank.capacity };
    });

    return NextResponse.json({
      success: true,
      entry: result.entry,
      tank: { capacity: result.capacity, liters: result.liters },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la înregistrare";
    console.error("admin/fuel POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
