import { NextRequest, NextResponse } from "next/server";
import { fuelAccess } from "@/lib/fuelAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Scoate un număr din listă. Alimentările vechi își păstrează numărul (FuelEntry.plate e text).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Ștergeri, prețuri și numere: doar cu rezervorul complet (nu „doar alimentare”).
  if ((await fuelAccess(req)) !== "full") {
    return NextResponse.json({ success: false, error: "Doar cine administrează rezervorul poate face asta" }, { status: 403 });
  }
  const { id } = await params;
  const removed = await prisma.fuelPlate.deleteMany({ where: { id } });
  if (!removed.count) return NextResponse.json({ success: false, error: "Numărul nu mai există" }, { status: 404 });
  return NextResponse.json({ success: true });
}
