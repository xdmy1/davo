// PATCH/DELETE /api/admin/accounts/colete/[id] — editarea și ștergerea unui
// cont de șofer colete.
//
// Aici se schimbă doar câmpurile CONTULUI: nume, PIN, rol, activ/blocat,
// destinațiile excluse, țările de colectare, contorul comun de ridicări.
// Intervalele de numere sunt rânduri separate în `driver_route_ranges` și au
// rutele lor (`./ranges`, `./ranges/[rangeId]`) — un PATCH care ar primi și
// lista lor ar trebui să ghicească singur ce rând s-a adăugat, ce s-a mutat și
// ce s-a șters, exact genul de diff care pierde tăcut o rută.
//
// Două reguli țin aplicația de colete funcțională, ambele verificate pe starea
// citită acum din Supabase, nu pe ce trimite formularul: nu rămâne fără niciun
// admin activ și nu se șterge un cont care are colete ne-arhivate în spate.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  coleteConfigured,
  deleteColeteDriver,
  listColeteDrivers,
  updateColeteDriver,
  type ColeteDriver,
  type ColeteRole,
} from "@/lib/coleteAdmin";
import {
  asBool,
  asCollectionCountries,
  asCountryList,
  asRole,
  asText,
  describeRange,
  NECONFIGURAT,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ColetePatch = {
  username?: string;
  pin?: string;
  role?: ColeteRole;
  excludedDestinations?: string[];
  allowedCollectionCountries?: string[] | null;
  sharedPickupCounter?: boolean;
  active?: boolean;
};

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

/** Alt admin care rămâne activ dacă șoferul dat își pierde rolul sau contul. */
function otherActiveAdmins(drivers: ColeteDriver[], id: string): number {
  return drivers.filter((d) => d.id !== id && d.role === "admin" && d.active).length;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  if (!coleteConfigured()) return fail(NECONFIGURAT, 503);

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Cerere invalidă", 400);

  const patch: ColetePatch = {};
  if (body.username !== undefined) patch.username = asText(body.username);
  // PIN gol la editare = „lasă-l pe cel vechi", exact ca la câmpurile de parolă.
  if (body.pin !== undefined && asText(body.pin).trim() !== "") patch.pin = asText(body.pin);
  if (body.role !== undefined) patch.role = asRole(body.role);
  if (body.excludedDestinations !== undefined) {
    patch.excludedDestinations = asCountryList(body.excludedDestinations);
  }
  if (body.allowedCollectionCountries !== undefined) {
    // `null` (fără acces la Colectări) și `[]` (acces, dar pe nicio țară) sunt
    // valori diferite în baza colete; parserul le păstrează distincte.
    patch.allowedCollectionCountries = asCollectionCountries(body.allowedCollectionCountries) ?? null;
  }
  if (body.sharedPickupCounter !== undefined) {
    const shared = asBool(body.sharedPickupCounter);
    if (shared === undefined) {
      return fail("Câmpul „contor comun de ridicări” trebuie să fie adevărat sau fals", 400);
    }
    patch.sharedPickupCounter = shared;
  }
  if (body.active !== undefined) {
    const active = asBool(body.active);
    // O valoare pe care n-o înțelegem nu se ignoră tăcut: adminul ar crede că a
    // dezactivat contul.
    if (active === undefined) return fail("Câmpul „activ” trebuie să fie adevărat sau fals", 400);
    patch.active = active;
  }

  const changed = Object.keys(patch);
  if (changed.length === 0) return fail("Nu ai trimis nicio modificare", 400);

  try {
    const drivers = await listColeteDrivers();
    const target = drivers.find((d) => d.id === id);
    if (!target) return fail("Contul de colete nu există", 404);

    const staysAdmin = (patch.role ?? target.role) === "admin";
    const staysActive = patch.active ?? target.active;
    const wasActiveAdmin = target.role === "admin" && target.active;
    if (wasActiveAdmin && !(staysAdmin && staysActive) && otherActiveAdmins(drivers, id) === 0) {
      const verb = staysAdmin ? "dezactiva" : "retrograda";
      return fail(
        `Nu poți ${verb} ultimul admin activ din colete („${target.username}”) — fără el nimeni nu mai poate administra aplicația. Promovează sau activează întâi alt admin.`,
        400,
      );
    }

    await updateColeteDriver(id, patch);

    // Acțiune distinctă când modificarea e una singură, ca jurnalul să se poată
    // citi dintr-o privire; altfel „update" cu lista câmpurilor trimise.
    const action =
      changed.length === 1 && patch.active !== undefined
        ? patch.active
          ? "activate"
          : "deactivate"
        : changed.length === 1 && patch.pin !== undefined
          ? "password"
          : "update";

    const details: Record<string, unknown> = { campuri: changed };
    if (patch.username && patch.username !== target.username) details.numeNou = patch.username;
    if (patch.role !== undefined) details.rol = patch.role;
    if (patch.excludedDestinations !== undefined) {
      details.destinatiiExcluse = patch.excludedDestinations;
    }
    if (patch.allowedCollectionCountries !== undefined) {
      details.colectari = patch.allowedCollectionCountries ?? "fără acces";
    }
    if (patch.sharedPickupCounter !== undefined) details.contorComun = patch.sharedPickupCounter;
    if (patch.active !== undefined) details.activ = patch.active;
    // Doar faptul că PIN-ul s-a schimbat, niciodată valoarea lui.
    if (patch.pin !== undefined) details.pinSchimbat = true;

    await audit({
      actorEmail: actor.email,
      action,
      system: "colete",
      targetId: id,
      targetName: target.username,
      details,
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva contul de colete";
    console.error("accounts/colete/[id] PATCH", error);
    return fail(message, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  if (!coleteConfigured()) return fail(NECONFIGURAT, 503);

  const { id } = await params;

  try {
    const drivers = await listColeteDrivers();
    const target = drivers.find((d) => d.id === id);
    if (!target) return fail("Contul de colete nu există", 404);

    if (target.parcels > 0) {
      return fail(
        `Șoferul „${target.username}” are colete ne-arhivate atribuite (${target.parcels}) — ștergerea contului ar rupe legătura cu ele. Dezactivează-l în schimb: PIN-ul nu mai funcționează, dar istoricul rămâne întreg.`,
        400,
      );
    }

    // Ștergerea înseamnă și retrogradare, și dezactivare — deci ultimul admin
    // activ e protejat și aici, nu doar la PATCH.
    if (target.role === "admin" && target.active && otherActiveAdmins(drivers, id) === 0) {
      return fail(
        `Nu poți șterge ultimul admin activ din colete („${target.username}”) — promovează întâi alt șofer la rol de admin.`,
        400,
      );
    }

    await deleteColeteDriver(id);

    await audit({
      actorEmail: actor.email,
      action: "delete",
      system: "colete",
      targetId: id,
      targetName: target.username,
      details: { rol: target.role, rute: target.routeRanges.map(describeRange) },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut șterge contul de colete";
    console.error("accounts/colete/[id] DELETE", error);
    return fail(message, 400);
  }
}
