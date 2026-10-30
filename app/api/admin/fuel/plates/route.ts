import { NextRequest, NextResponse } from "next/server";
import { fuelAccess } from "@/lib/fuelAccess";
import { prisma } from "@/lib/prisma";
import { normalizePlate } from "@/lib/fuelPlates";

// Numerele de înmatriculare ale rezervorului. Accesul îl dă secțiunea „fuel” (proxy.ts).
export const dynamic = "force-dynamic";

export async function GET() {
  const plates = await prisma.fuelPlate.findMany({ orderBy: { plate: "asc" } });
  return NextResponse.json({ success: true, plates });
}

export async function POST(req: NextRequest) {
  // Ștergeri, prețuri și numere: doar cu rezervorul complet (nu „doar alimentare”).
  if ((await fuelAccess(req)) !== "full") {
    return NextResponse.json({ success: false, error: "Doar cine administrează rezervorul poate face asta" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { plate?: unknown };
  const plate = normalizePlate(body.plate);
  if (!plate) return NextResponse.json({ success: false, error: "Scrie numărul de înmatriculare (ex. DAW 077)" }, { status: 400 });
  const exists = await prisma.fuelPlate.findUnique({ where: { plate } });
  if (exists) return NextResponse.json({ success: false, error: `${plate} e deja în listă` }, { status: 409 });
  const created = await prisma.fuelPlate.create({ data: { plate } });
  return NextResponse.json({ success: true, plate: created });
}
