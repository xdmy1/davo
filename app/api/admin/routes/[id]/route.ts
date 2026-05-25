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

    // Sincronizare preț bidirecțional: dacă s-a schimbat basePrice sau currency,
    // aplicăm aceleași valori și pe ruta inversă (originCity ↔ destinationCity).
    // Motivul: prețul reprezintă transportul orașul X ↔ Chișinău, nu o direcție —
    // dacă schimbi prețul Chișinău→London, automat și London→Chișinău primește
    // același tarif (și invers).
    if (data.basePrice !== undefined || data.currency !== undefined) {
      try {
        const inverse = await prisma.route.findUnique({
          where: {
            originCityId_destinationCityId: {
              originCityId: route.destinationCityId,
              destinationCityId: route.originCityId,
            },
          },
          select: { id: true, basePrice: true, currency: true },
        });
        if (inverse) {
          const inverseData: Record<string, unknown> = {};
          if (data.basePrice !== undefined && inverse.basePrice !== route.basePrice) {
            inverseData.basePrice = route.basePrice;
          }
          if (data.currency !== undefined && inverse.currency !== route.currency) {
            inverseData.currency = route.currency;
          }
          if (Object.keys(inverseData).length > 0) {
            await prisma.route.update({ where: { id: inverse.id }, data: inverseData });
          }
        }
      } catch (syncErr) {
        // Sincronizarea e best-effort. Update-ul direct a trecut, doar inversa
        // poate fi out-of-sync (rar — admin poate edita manual).
        console.warn("admin/routes PATCH inverse sync:", syncErr);
      }
    }

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
