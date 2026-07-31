// GET/POST /api/admin/accounts/colete — conturile de șoferi din aplicația colete.
//
// Colete stă într-un proiect Supabase separat, iar tot dialogul cu el trece
// prin `lib/coleteAdmin.ts`: cheia `service_role`, ordinea auth→profil→intervale
// și rollback-ul la creare sunt lucruri care nu au voie să se rescrie per rută.
//
// Intervalele de numere NU stau pe profil: sunt rânduri în
// `driver_route_ranges`, unul pe rută (origine → destinație). La creare pot fi
// trimise odată cu contul, în `routeRanges`; după aceea se editează rând cu rând
// prin sub-rutele `/[id]/ranges`.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import { coleteConfigured, createColeteDriver, listColeteDrivers } from "@/lib/coleteAdmin";
import {
  asCollectionCountries,
  asCountryList,
  asRangeInput,
  asRole,
  asText,
  describeRange,
  NECONFIGURAT,
} from "./_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  // Panoul e util și fără colete (davo și rezervari stau în Postgres-ul propriu),
  // deci lipsa variabilelor nu e o defecțiune — e o stare pe care UI-ul o explică.
  if (!coleteConfigured()) {
    // `success: true` cu `configured: false`: nu e o eroare de cerere, e o
    // integrare nepornită. UI-ul afișează explicația, nu un banner roșu.
    return NextResponse.json({
      success: true,
      configured: false,
      drivers: [],
      message: NECONFIGURAT,
    });
  }

  try {
    const drivers = await listColeteDrivers();
    return NextResponse.json({ success: true, configured: true, drivers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi șoferii colete";
    console.error("accounts/colete GET", error);
    // 502: cine a picat e Supabase-ul colete, nu cererea adminului.
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  if (!coleteConfigured()) {
    return NextResponse.json({ success: false, error: NECONFIGURAT }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ success: false, error: "Cerere invalidă" }, { status: 400 });
  }

  try {
    const driver = await createColeteDriver({
      username: asText(body.username),
      pin: asText(body.pin),
      role: asRole(body.role),
      excludedDestinations: asCountryList(body.excludedDestinations),
      // Contul nou fără câmpul trimis pornește FĂRĂ acces la Colectări (`null`),
      // nu cu acces „pe nicio țară” — e varianta prudentă și cea mai frecventă
      // în baza reală.
      allowedCollectionCountries: asCollectionCountries(body.allowedCollectionCountries) ?? null,
      sharedPickupCounter: body.sharedPickupCounter === true,
      routeRanges: Array.isArray(body.routeRanges) ? body.routeRanges.map(asRangeInput) : [],
    });

    await audit({
      actorEmail: actor.email,
      action: "create",
      system: "colete",
      targetId: driver.id,
      targetName: driver.username,
      // PIN-ul e credențialul de login al șoferului: se întoarce în răspuns
      // (adminul trebuie să i-l comunice), dar nu ajunge niciodată în jurnal.
      details: {
        rol: driver.role,
        rute: driver.routeRanges.map(describeRange),
        destinatiiExcluse: driver.excludedDestinations,
        colectari: driver.allowedCollectionCountries ?? "fără acces",
        contorComun: driver.sharedPickupCounter,
      },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, driver });
  } catch (error) {
    // Mesajele din `coleteAdmin` sunt deja scrise pentru om, în română.
    const message = error instanceof Error ? error.message : "Nu am putut crea contul de colete";
    console.error("accounts/colete POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
