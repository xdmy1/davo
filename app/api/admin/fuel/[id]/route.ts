import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FifoError } from "@/lib/fuelFifo";
import { LEDGER_TX_OPTIONS, lockTank, syncFuelLedger } from "@/lib/fuelLedger";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Operație inexistentă";

// Mesajele pentru utilizator: doar erorile noastre, nu detalii interne din DB.
function userMessage(error: unknown, fallback: string): string {
  if (error instanceof FifoError) return error.message;
  if (error instanceof Error && error.message === NOT_FOUND) return NOT_FOUND;
  return fallback;
}

// Șterge o operație (corectare greșeli). Stocul, soldurile și costul FIFO al
// tuturor operațiilor de după se recalculează din istoric. O reumplere a cărei
// motorină a fost deja alimentată nu poate fi ștearsă (stocul ar deveni negativ).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const tank = await lockTank(tx);
      const entry = await tx.fuelEntry.findUnique({ where: { id } });
      if (!entry) throw new Error(NOT_FOUND);

      await tx.fuelEntry.delete({ where: { id } });
      try {
        const fifo = await syncFuelLedger(tx);
        return { liters: fifo.balance, capacity: tank.capacity };
      } catch (err) {
        if (err instanceof FifoError) {
          throw new FifoError(
            `Nu se poate șterge: motorina din această adăugare a fost deja folosită (${err.message}). Șterge întâi alimentările de după, apoi reîncearcă.`
          );
        }
        throw err;
      }
    }, LEDGER_TX_OPTIONS);

    return NextResponse.json({ success: true, tank: { capacity: result.capacity, liters: result.liters } });
  } catch (error) {
    console.error("admin/fuel DELETE", error);
    return NextResponse.json({ success: false, error: userMessage(error, "Eroare la ștergere") }, { status: 400 });
  }
}

// Corectează prețul per litru al unei reumpleri. Toate alimentările care au
// consumat din lotul respectiv își recalculează costul (FIFO).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const priceRaw = Number(body?.pricePerLiter);
    if (!Number.isFinite(priceRaw) || priceRaw <= 0) {
      return NextResponse.json({ success: false, error: "Prețul per litru trebuie să fie mai mare ca 0." }, { status: 400 });
    }
    const pricePerLiter = Math.round(priceRaw * 100) / 100;

    const entry = await prisma.$transaction(async (tx) => {
      await lockTank(tx);
      const existing = await tx.fuelEntry.findUnique({ where: { id } });
      if (!existing) throw new Error(NOT_FOUND);
      if (existing.kind !== "refill") throw new FifoError("Doar prețul unei adăugări în rezervor se poate corecta.");

      await tx.fuelEntry.update({ where: { id }, data: { pricePerLiter } });
      await syncFuelLedger(tx);
      return tx.fuelEntry.findUniqueOrThrow({ where: { id } });
    }, LEDGER_TX_OPTIONS);

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("admin/fuel PATCH", error);
    return NextResponse.json({ success: false, error: userMessage(error, "Eroare la salvarea prețului") }, { status: 400 });
  }
}
