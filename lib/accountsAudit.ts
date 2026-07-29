// Jurnalul panoului „Conturi & Acces": cine, ce a schimbat, în ce sistem.
//
// `audit()` nu aruncă NICIODATĂ. O scriere eșuată în jurnal nu are voie să
// anuleze o operație deja reușită (contul e creat, parola e schimbată) — ar
// lăsa apelantul cu impresia că nu s-a întâmplat nimic.

import { prisma } from "@/lib/prisma";

// Detaliile sunt pentru citit de om într-o listă; taie-le înainte să umple baza.
const MAX_DETAILS = 2000;

export type AccountSystem = "davo" | "rezervari" | "colete" | "gate";

export type AuditEntry = {
  actorEmail: string;
  action: string;
  system: AccountSystem;
  targetId?: string | null;
  targetName: string;
  /** Se serializează JSON. NICIODATĂ parole, hash-uri sau PIN-uri. */
  details?: unknown;
  ip?: string | null;
};

function serializeDetails(details: unknown): string | null {
  if (details === undefined || details === null) return null;
  try {
    const json = typeof details === "string" ? details : JSON.stringify(details);
    if (!json) return null;
    return json.length > MAX_DETAILS ? `${json.slice(0, MAX_DETAILS)}…` : json;
  } catch {
    return null; // referințe circulare, BigInt etc. — jurnalul nu merită o excepție
  }
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.accountAudit.create({
      data: {
        actorEmail: entry.actorEmail,
        action: entry.action,
        system: entry.system,
        targetId: entry.targetId ?? null,
        targetName: entry.targetName,
        details: serializeDetails(entry.details),
        ip: entry.ip ?? null,
      },
    });
  } catch (error) {
    console.error("accountsAudit", error);
  }
}
