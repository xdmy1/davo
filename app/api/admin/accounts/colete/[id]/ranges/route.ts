// POST /api/admin/accounts/colete/[id]/ranges — adaugă o rută cu interval de
// numere unui șofer din colete.
//
// Intervalele sunt rânduri de sine stătătoare în `driver_route_ranges`, cheia
// (driver_id, origin, destination) fiind exact ce caută aplicația colete când
// numerotează un colet. De asta au rute proprii, la nivel de rând: adăugarea
// unei rute nu are nimic de-a face cu PIN-ul sau rolul contului și nu trebuie
// să ceară retrimiterea lor.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import { coleteConfigured, coleteDriverName, createColeteRouteRange } from "@/lib/coleteAdmin";
import { asRangeInput, describeRange, NECONFIGURAT } from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  if (!coleteConfigured()) {
    return NextResponse.json({ success: false, error: NECONFIGURAT }, { status: 503 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: "Cerere invalidă" }, { status: 400 });

  try {
    const range = await createColeteRouteRange(id, asRangeInput(body));

    await audit({
      actorEmail: actor.email,
      action: "update",
      system: "colete",
      targetId: id,
      targetName: await coleteDriverName(id),
      details: { campuri: ["routeRanges"], adaugat: describeRange(range) },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, range });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut adăuga intervalul";
    console.error("accounts/colete/[id]/ranges POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
