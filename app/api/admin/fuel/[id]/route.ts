import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TANK_ID = "1";

// Șterge o operație și îi anulează efectul asupra stocului (corectare greșeli):
// un refill șters scade litrii înapoi, un dispense șters îi adaugă la loc.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.fuelEntry.findUnique({ where: { id } });
      if (!entry) throw new Error("Operație inexistentă");

      const tank = await tx.fuelTank.findUnique({ where: { id: TANK_ID } });
      const current = tank?.liters ?? 0;
      const capacity = tank?.capacity ?? 9000;

      // Inversează efectul: refill a adăugat → scădem; dispense a scăzut → adăugăm.
      const reversed = entry.kind === "refill" ? current - entry.liters : current + entry.liters;
      const clamped = Math.max(0, Math.min(capacity, round(reversed)));

      await tx.fuelEntry.delete({ where: { id } });
      await tx.fuelTank.update({ where: { id: TANK_ID }, data: { liters: clamped } });

      return { liters: clamped, capacity };
    });

    return NextResponse.json({ success: true, tank: { capacity: result.capacity, liters: result.liters } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la ștergere";
    console.error("admin/fuel DELETE", error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
