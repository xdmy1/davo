import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — editează un punct (tip, intervale, ultima efectuare, notițe, activ).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.type === "string") data.type = body.type.trim();
    if ("intervalKm" in body)
      data.intervalKm = body.intervalKm === null || body.intervalKm === "" ? null : Math.round(Number(body.intervalKm));
    if ("intervalDays" in body)
      data.intervalDays =
        body.intervalDays === null || body.intervalDays === "" ? null : Math.round(Number(body.intervalDays));
    if ("lastServiceKm" in body)
      data.lastServiceKm = body.lastServiceKm === null || body.lastServiceKm === "" ? null : Number(body.lastServiceKm);
    if ("lastServiceAt" in body && body.lastServiceAt) {
      const d = new Date(body.lastServiceAt);
      if (Number.isNaN(d.getTime()))
        return NextResponse.json({ success: false, error: "Dată invalidă" }, { status: 400 });
      data.lastServiceAt = d;
    }
    if ("notes" in body) data.notes = body.notes ? String(body.notes).trim() : null;
    if (typeof body.active === "boolean") data.active = body.active;

    const item = await prisma.maintenanceItem.update({ where: { id }, data });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la actualizare";
    console.error("maintenance PATCH", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE — șterge punctul (și istoricul lui, prin cascade).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.maintenanceItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la ștergere";
    console.error("maintenance DELETE", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
