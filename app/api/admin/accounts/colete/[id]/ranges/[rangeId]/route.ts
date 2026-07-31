// PATCH/DELETE /api/admin/accounts/colete/[id]/ranges/[rangeId] — un singur
// rând din `driver_route_ranges`.
//
// `driverId` face parte din adresă și e pus și în filtrul cererii spre Supabase:
// un `rangeId` corect, dar al altui șofer, nu trebuie să se poată modifica din
// pagina altcuiva. Când filtrul nu prinde nimic, `coleteAdmin` aruncă
// „Intervalul nu există la acest șofer" în loc să raporteze o reușită goală.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  coleteConfigured,
  coleteDriverName,
  deleteColeteRouteRange,
  listDriverRouteRanges,
  updateColeteRouteRange,
} from "@/lib/coleteAdmin";
import { asInt, asText, describeRange, NECONFIGURAT } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; rangeId: string }> };

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  if (!coleteConfigured()) return fail(NECONFIGURAT, 503);

  const { id, rangeId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Cerere invalidă", 400);

  // Doar câmpurile trimise: `coleteAdmin` completează restul din rândul curent
  // și validează intervalul întreg, nu doar capătul schimbat.
  const patch: { origin?: string; destination?: string; rangeStart?: number; rangeEnd?: number } = {};
  if (body.origin !== undefined) patch.origin = asText(body.origin);
  if (body.destination !== undefined) patch.destination = asText(body.destination);
  if (body.rangeStart !== undefined) patch.rangeStart = asInt(body.rangeStart);
  if (body.rangeEnd !== undefined) patch.rangeEnd = asInt(body.rangeEnd);

  if (Object.keys(patch).length === 0) return fail("Nu ai trimis nicio modificare", 400);

  try {
    const range = await updateColeteRouteRange(id, rangeId, patch);

    await audit({
      actorEmail: actor.email,
      action: "update",
      system: "colete",
      targetId: id,
      targetName: await coleteDriverName(id),
      details: { campuri: ["routeRanges"], modificat: describeRange(range) },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, range });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva intervalul";
    console.error("accounts/colete/[id]/ranges/[rangeId] PATCH", error);
    return fail(message, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  if (!coleteConfigured()) return fail(NECONFIGURAT, 503);

  const { id, rangeId } = await params;

  try {
    // Citit înainte de ștergere, ca jurnalul să spună CE rută a dispărut; după
    // aceea informația nu mai există nicăieri.
    const before = (await listDriverRouteRanges(id)).find((row) => row.id === rangeId);

    await deleteColeteRouteRange(id, rangeId);

    await audit({
      actorEmail: actor.email,
      action: "update",
      system: "colete",
      targetId: id,
      targetName: await coleteDriverName(id),
      details: {
        campuri: ["routeRanges"],
        sters: before ? describeRange(before) : rangeId,
      },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut șterge intervalul";
    console.error("accounts/colete/[id]/ranges/[rangeId] DELETE", error);
    return fail(message, 400);
  }
}
