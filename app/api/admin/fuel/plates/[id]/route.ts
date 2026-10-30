import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Scoate un număr din listă. Alimentările vechi își păstrează numărul (FuelEntry.plate e text).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = await prisma.fuelPlate.deleteMany({ where: { id } });
  if (!removed.count) return NextResponse.json({ success: false, error: "Numărul nu mai există" }, { status: 404 });
  return NextResponse.json({ success: true });
}
