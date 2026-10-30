import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePlate } from "@/lib/fuelPlates";

// Numerele de înmatriculare ale rezervorului. Accesul îl dă secțiunea „fuel” (proxy.ts).
export const dynamic = "force-dynamic";

export async function GET() {
  const plates = await prisma.fuelPlate.findMany({ orderBy: { plate: "asc" } });
  return NextResponse.json({ success: true, plates });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { plate?: unknown };
  const plate = normalizePlate(body.plate);
  if (!plate) return NextResponse.json({ success: false, error: "Scrie numărul de înmatriculare (ex. DAW 077)" }, { status: 400 });
  const exists = await prisma.fuelPlate.findUnique({ where: { plate } });
  if (exists) return NextResponse.json({ success: false, error: `${plate} e deja în listă` }, { status: 409 });
  const created = await prisma.fuelPlate.create({ data: { plate } });
  return NextResponse.json({ success: true, plate: created });
}
