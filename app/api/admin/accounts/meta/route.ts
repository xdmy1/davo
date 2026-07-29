// GET /api/admin/accounts/meta — tot ce are nevoie UI-ul ca să deseneze
// panoul: catalogul de secțiuni al fiecărui sistem, presetele de rol, dacă
// integrarea colete e configurată și cine e adminul conectat.
//
// Catalogul vine de aici, nu din bundle-ul clientului, ca selectorul de
// permisiuni să nu poată rămâne în urma serverului care validează cheile.

import { NextRequest, NextResponse } from "next/server";
import { requireAccountsAccess } from "@/lib/accountsAuth";
import { GATE_TTL_MS } from "@/lib/accountsGate";
import { coleteConfigured } from "@/lib/coleteAdmin";
import { ADMIN_SECTIONS, ROLE_PRESETS } from "@/lib/permissions";
import { REZERVARI_ROLE_PRESETS, REZERVARI_SECTIONS } from "@/lib/rezervariSections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  return NextResponse.json({
    success: true,
    // Doar ce afișează selectorul de permisiuni. Prefixele `ui`/`api` rămân pe
    // server: sunt detaliu de rutare, nu informație pentru bifat căsuțe.
    davoSections: ADMIN_SECTIONS.map((s) => ({ key: s.key, label: s.label, group: s.group })),
    rezervariSections: REZERVARI_SECTIONS.map((s) => ({
      key: s.key,
      label: s.label,
      group: s.group,
    })),
    davoPresets: ROLE_PRESETS,
    rezervariPresets: REZERVARI_ROLE_PRESETS,
    // Fals când lipsesc COLETE_SUPABASE_* — UI-ul dezactivează tabul în loc să
    // arate o eroare de rețea la fiecare încărcare.
    coleteConfigured: coleteConfigured(),
    // Emailul actorului: regulile „nu te poți șterge/dezactiva/retrograda pe
    // tine" sunt aplicate de server, dar UI-ul poate ascunde butoanele din start.
    actorEmail: actor.email,
    actorRole: actor.role,
    gateTtlMs: GATE_TTL_MS,
  });
}
