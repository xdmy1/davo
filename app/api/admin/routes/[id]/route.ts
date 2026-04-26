import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.basePrice !== undefined) data.basePrice = Number(body.basePrice);
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.weeklyDepartures !== undefined) data.weeklyDepartures = Number(body.weeklyDepartures);
    if (body.active !== undefined) data.active = !!body.active;
    if (body.originCityId !== undefined) data.originCityId = body.originCityId;
    if (body.destinationCityId !== undefined) data.destinationCityId = body.destinationCityId;

    const route = await prisma.route.update({ where: { id }, data });
    return NextResponse.json({ success: true, route });
  } catch (error) {
    console.error("admin/routes PATCH", error);
    return NextResponse.json({ success: false, error: "Failed to update route" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripCount = await prisma.trip.count({ where: { routeId: id } });
    if (tripCount > 0) {
      return NextResponse.json(
        { success: false, error: `Ruta are ${tripCount} curse asociate. Dezactiveaz-o în loc să o ștergi.` },
        { status: 409 }
      );
    }
    await prisma.route.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin/routes DELETE", error);
    return NextResponse.json({ success: false, error: "Failed to delete route" }, { status: 500 });
  }
}
