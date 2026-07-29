// POST /api/admin/accounts/gate-pin — schimbă PIN-ul secțiunii „Conturi & Acces".
//
// Cere PIN-ul curent chiar dacă apelantul e deja înăuntru: tokenul de poartă
// poate avea până la 30 de minute, iar preluarea unui laptop lăsat deschis nu
// trebuie să permită schimbarea parolei care protejează toate conturile.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  GATE_UNCONFIGURED_ERROR,
  gateBlockedSeconds,
  gateStatus,
  recordGateFailure,
  recordGateSuccess,
  setGatePin,
  verifyGatePin,
} from "@/lib/accountsGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PIN_RE = /^\d{4,}$/;

export async function POST(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;
  const actor = guard.actor;

  const ip = clientIp(req);
  // Aceeași cheie ca la /unlock: se ghicește exact același secret, deci
  // încercările trebuie să se adune în același contor.
  const key = `${actor.email}|${ip}`;

  const blocked = gateBlockedSeconds(key);
  if (blocked > 0) {
    const minutes = Math.ceil(blocked / 60);
    return NextResponse.json(
      {
        success: false,
        error: `Prea multe încercări greșite. Reîncearcă peste ${minutes} ${
          minutes === 1 ? "minut" : "minute"
        }.`,
        retryAfter: blocked,
      },
      { status: 429, headers: { "Retry-After": String(blocked) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    currentPin?: unknown;
    newPin?: unknown;
    confirmPin?: unknown;
  };
  const currentPin = typeof body.currentPin === "string" ? body.currentPin.trim() : "";
  const newPin = typeof body.newPin === "string" ? body.newPin.trim() : "";
  const confirmPin = typeof body.confirmPin === "string" ? body.confirmPin.trim() : null;

  if (!currentPin) {
    return NextResponse.json({ success: false, error: "Introdu PIN-ul curent" }, { status: 400 });
  }
  if (!PIN_RE.test(newPin)) {
    return NextResponse.json(
      { success: false, error: "PIN-ul nou trebuie să conțină minimum 4 cifre" },
      { status: 400 },
    );
  }
  // Confirmarea e opțională în corpul cererii (UI-ul o cere oricum): dacă vine,
  // o verificăm și pe server, ca o greșeală de tastare să nu blocheze secțiunea.
  if (confirmPin !== null && confirmPin !== newPin) {
    return NextResponse.json({ success: false, error: "PIN-urile noi nu coincid" }, { status: 400 });
  }
  if (newPin === currentPin) {
    return NextResponse.json(
      { success: false, error: "PIN-ul nou trebuie să fie diferit de cel curent" },
      { status: 400 },
    );
  }

  if ((await gateStatus()) === "unconfigured") {
    return NextResponse.json({ success: false, error: GATE_UNCONFIGURED_ERROR }, { status: 503 });
  }

  if (!(await verifyGatePin(currentPin))) {
    recordGateFailure(key);
    await audit({
      actorEmail: actor.email,
      action: "unlock_fail",
      system: "gate",
      targetName: actor.email,
      details: { context: "gate_pin" },
      ip,
    });
    return NextResponse.json({ success: false, error: "PIN-ul curent e incorect" }, { status: 401 });
  }

  recordGateSuccess(key);

  try {
    await setGatePin(newPin);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nu am putut salva PIN-ul secțiunii";
    console.error("accounts/gate-pin POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  // Fără PIN-uri în jurnal, nici cel vechi, nici cel nou.
  await audit({
    actorEmail: actor.email,
    action: "gate_pin",
    system: "gate",
    targetName: "PIN-ul secțiunii",
    ip,
  });

  // Tokenul de poartă e semnat cu secretul de sesiune, nu cu PIN-ul, deci
  // sesiunea curentă rămâne validă — schimbarea nu te dă afară din secțiune.
  return NextResponse.json({ success: true });
}
