// POST /api/admin/accounts/unlock — singura rută din secțiune care NU cere
// tokenul de poartă: ea abia îl emite. Verifică sesiunea, permisiunea
// „accounts", limita de încercări și PIN-ul secțiunii.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAccountsSession } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  GATE_TTL_MS,
  GATE_UNCONFIGURED_ERROR,
  createGateToken,
  gateBlockedSeconds,
  gateStatus,
  recordGateFailure,
  recordGateSuccess,
  verifyGatePin,
} from "@/lib/accountsGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function blockedResponse(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return NextResponse.json(
    {
      success: false,
      error: `Prea multe încercări greșite. Reîncearcă peste ${minutes} ${
        minutes === 1 ? "minut" : "minute"
      }.`,
      retryAfter: seconds,
    },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}

export async function POST(req: NextRequest) {
  const guard = await requireAccountsSession(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  const ip = clientIp(req);
  // Cheia leagă blocajul de cont ȘI de IP: un atacator de pe altă rețea nu
  // poate bloca la nesfârșit contul unui admin real.
  const key = `${actor.email}|${ip}`;

  const alreadyBlocked = gateBlockedSeconds(key);
  if (alreadyBlocked > 0) return blockedResponse(alreadyBlocked);

  const body = (await req.json().catch(() => ({}))) as { pin?: unknown };
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  // Câmp gol = Enter apăsat din greșeală, nu o încercare de ghicit; nu-l
  // punem la socoteala celor 5 încercări.
  if (!pin) {
    return NextResponse.json(
      { success: false, error: "Introdu PIN-ul secțiunii" },
      { status: 400 },
    );
  }

  // Verificat înainte de PIN: o poartă neconfigurată trebuie să spună asta
  // explicit, nu „PIN greșit" — altfel adminul caută un PIN care nu există.
  if ((await gateStatus()) === "unconfigured") {
    return NextResponse.json(
      { success: false, error: GATE_UNCONFIGURED_ERROR },
      { status: 503 },
    );
  }

  if (!(await verifyGatePin(pin))) {
    recordGateFailure(key);
    await audit({
      actorEmail: actor.email,
      action: "unlock_fail",
      system: "gate",
      targetName: actor.email,
      ip,
    });

    // A cincea greșeală declanșează blocajul chiar acum: răspundem cu 429, ca
    // UI-ul să pornească direct contorul, nu la următoarea apăsare.
    const nowBlocked = gateBlockedSeconds(key);
    if (nowBlocked > 0) return blockedResponse(nowBlocked);

    return NextResponse.json({ success: false, error: "PIN incorect" }, { status: 401 });
  }

  recordGateSuccess(key);

  // Calculat ÎNAINTE de emitere: valoarea trimisă clientului rămâne astfel
  // ceva mai devreme decât expirarea reală din token, niciodată mai târziu.
  const expiresAt = Date.now() + GATE_TTL_MS;
  const token = await createGateToken(actor.email);

  return NextResponse.json({ success: true, token, expiresAt });
}
