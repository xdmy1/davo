// PATCH/DELETE /api/admin/accounts/colete/[id] — editarea și ștergerea unui
// cont de șofer colete.
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NECONFIGURAT =
  "Baza colete nu e configurată — adaugă COLETE_SUPABASE_URL și COLETE_SUPABASE_SERVICE_KEY în variabilele de mediu";

type ColetePatch = {
  username?: string;
  pin?: string;
  role?: ColeteRole;
  rangeStart?: number;
  rangeEnd?: number;
  active?: boolean;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRole(value: unknown): ColeteRole {
  return asText(value).trim() as ColeteRole;
}

function asInt(value: unknown): number {
  if (typeof value === "number") return value;
  const text = asText(value).trim();
  return text ? Number(text) : NaN;
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

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
  if (body.rangeStart !== undefined) patch.rangeStart = asInt(body.rangeStart);
  if (body.rangeEnd !== undefined) patch.rangeEnd = asInt(body.rangeEnd);
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
    if (patch.rangeStart !== undefined || patch.rangeEnd !== undefined) {
      details.interval = [patch.rangeStart ?? target.rangeStart, patch.rangeEnd ?? target.rangeEnd];
    }
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
      details: { rol: target.role, interval: [target.rangeStart, target.rangeEnd] },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut șterge contul de colete";
    console.error("accounts/colete/[id] DELETE", error);
    return fail(message, 400);
  }
}
