// GET /api/admin/accounts/audit — jurnalul panoului, cele mai recente intrări
// întâi. Filtru opțional `?system=davo|rezervari|colete|gate`.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountsAccess } from "@/lib/accountsAuth";
import type { AccountSystem } from "@/lib/accountsAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIMIT = 200;

const SYSTEMS: AccountSystem[] = ["davo", "rezervari", "colete", "gate"];

// Valorile care înseamnă „fără filtru". Le acceptăm explicit ca un tab „Toate"
// să nu depindă de faptul că UI-ul își amintește să omită parametrul.
const ALL_VALUES = ["", "all", "toate"];

export async function GET(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const raw = (req.nextUrl.searchParams.get("system") ?? "").trim().toLowerCase();
  const filtered = !ALL_VALUES.includes(raw);

  if (filtered && !SYSTEMS.includes(raw as AccountSystem)) {
    return NextResponse.json(
      { success: false, error: `Sistem necunoscut. Valori acceptate: ${SYSTEMS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const entries = await prisma.accountAudit.findMany({
      where: filtered ? { system: raw } : undefined,
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    });

    return NextResponse.json({
      success: true,
      entries: entries.map((e) => ({
        id: e.id,
        actorEmail: e.actorEmail,
        action: e.action,
        system: e.system,
        targetId: e.targetId,
        targetName: e.targetName,
        // Rămâne string (JSON scurt) sau null, exact cum a fost scris: nu-l
        // parsăm aici, fiindcă `audit()` acceptă și detalii text simplu.
        details: e.details,
        ip: e.ip,
        createdAt: e.createdAt.toISOString(),
      })),
      limit: LIMIT,
    });
  } catch (error) {
    console.error("accounts/audit GET", error);
    return NextResponse.json(
      { success: false, error: "Nu am putut încărca jurnalul" },
      { status: 500 },
    );
  }
}
