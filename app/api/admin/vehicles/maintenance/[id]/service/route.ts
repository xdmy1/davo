import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVehicleCounters } from "@/lib/gelios";

export const dynamic = "force-dynamic";

// POST — marchează service-ul ca efectuat. Scrie în istoric (MaintenanceLog) și
// resetează punctul: lastServiceKm ← odometrul curent din Gelios (sau valoarea
// dată manual), lastServiceAt ← data dată (sau acum). De aici repornește numărătoarea.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const item = await prisma.maintenanceItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ success: false, error: "Punct inexistent" }, { status: 404 });

    const serviceAt = body.serviceAt ? new Date(body.serviceAt) : new Date();
    if (Number.isNaN(serviceAt.getTime()))
      return NextResponse.json({ success: false, error: "Dată invalidă" }, { status: 400 });

    // Odometru la efectuare: manual dacă e dat, altfel live din Gelios.
    let serviceKm: number | null =
      body.serviceKm != null && body.serviceKm !== "" ? Number(body.serviceKm) : null;
    if (serviceKm === null) {
      const c = await getVehicleCounters(item.geliosUnitId);
      serviceKm = c.mileageKm;
    }

    const numOrNull = (v: unknown) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
    const laborCost = numOrNull(body.laborCost);
    const partsCost = numOrNull(body.partsCost);
    // Total = manoperă + piese dacă e cel puțin una; altfel fallback la `cost` brut.
    const cost = laborCost !== null || partsCost !== null ? (laborCost ?? 0) + (partsCost ?? 0) : numOrNull(body.cost);
    const notes = body.notes ? String(body.notes).trim() : null;
    const createdByName = body.by ? String(body.by).trim() : null;

    const [, updated] = await prisma.$transaction([
      prisma.maintenanceLog.create({
        data: { itemId: id, serviceKm, serviceAt, laborCost, partsCost, cost, notes, createdByName },
      }),
      prisma.maintenanceItem.update({
        where: { id },
        data: { lastServiceKm: serviceKm, lastServiceAt: serviceAt },
      }),
    ]);

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la înregistrare service";
    console.error("maintenance service POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET — istoricul efectuărilor pentru un punct.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const logs = await prisma.maintenanceLog.findMany({
      where: { itemId: id },
      orderBy: { serviceAt: "desc" },
    });
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare istoric";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
