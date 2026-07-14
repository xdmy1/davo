import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/lib/gelios";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Analiză completă pe vehicul + interval: traseu, statistici GPS (km, viteze,
// timp mișcare/staționare), tabele raport Gelios, plus combustibilul alimentat
// din rezervorul davo (potrivit după numărul de înmatriculare = numele unității)
// și consumul calculat (l/100km, cost).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const url = new URL(req.url);
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    const plate = (url.searchParams.get("plate") || "").trim();

    if (!Number.isFinite(numId) || !Number.isFinite(from) || !Number.isFinite(to)) {
      return NextResponse.json({ success: false, error: "parametri invalizi" }, { status: 400 });
    }

    const { points, stats, tables } = await getAnalytics(numId, from, to);

    // Combustibil alimentat în acest vehicul (din rezervorul davo), în interval.
    const fuelEntries = plate
      ? await prisma.fuelEntry.findMany({
          where: {
            kind: "dispense",
            plate,
            createdAt: { gte: new Date(from * 1000), lte: new Date(to * 1000) },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, liters: true, pricePerLiter: true, notes: true, createdAt: true },
        })
      : [];

    const fuelLiters = Math.round(fuelEntries.reduce((s, e) => s + e.liters, 0) * 10) / 10;
    const fuelCost =
      Math.round(fuelEntries.reduce((s, e) => s + e.liters * (e.pricePerLiter ?? 0), 0) * 100) / 100;

    const km = stats.mileageKm;
    const consumption = km > 0 && fuelLiters > 0 ? Math.round((fuelLiters / km) * 100 * 10) / 10 : null; // l/100km
    const costPer100 = km > 0 && fuelCost > 0 ? Math.round((fuelCost / km) * 100 * 10) / 10 : null;
    const costPerKm = km > 0 && fuelCost > 0 ? Math.round((fuelCost / km) * 100) / 100 : null;

    return NextResponse.json({
      success: true,
      track: points,
      stats,
      tables,
      fuel: {
        liters: fuelLiters,
        cost: fuelCost,
        entries: fuelEntries.map((e) => ({
          id: e.id,
          liters: e.liters,
          pricePerLiter: e.pricePerLiter,
          notes: e.notes,
          at: Math.floor(e.createdAt.getTime() / 1000),
        })),
      },
      consumption: { l100km: consumption, costPer100, costPerKm },
      fetchedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gelios error";
    console.error("admin/vehicles analytics", error);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
