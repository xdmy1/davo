/**
 * Setează PIN-ul secțiunii „Conturi & Acces” — hash bcrypt în tabela `Settings`,
 * cheia citită de lib/accountsGate.ts.
 *
 * PIN-ul nu are valoare implicită aici: orice default ar ajunge în git și ar
 * face poarta inutilă. Se dă explicit, la fiecare rulare.
 *
 * Usage:
 *   npm run accounts:pin -- 4821
 *   npx tsx scripts/set-accounts-pin.ts 4821
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Aceeași cheie pe care o rezolvă lib/accountsGate.ts (Settings → env → eroare).
const SETTINGS_KEY = "accounts_gate_pin";

async function main() {
  const pin = (process.argv[2] ?? "").trim();

  if (!/^\d{4,}$/.test(pin)) {
    console.error("✗ PIN invalid — sunt necesare minimum 4 cifre.");
    console.error("  Exemplu: npm run accounts:pin -- 4821");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  // 10 runde, cât folosește și `setGatePin` din lib/accountsGate.ts: PIN-ul se
  // verifică la fiecare intrare în secțiune, deci costul rămâne moderat.
  const hash = await bcrypt.hash(pin, 10);

  // `id` = cheia, ca în lib/session.ts — modelul Settings are id-ul propriu,
  // dar rândurile create de aplicație folosesc convenția asta.
  await prisma.settings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: hash },
    create: { id: SETTINGS_KEY, key: SETTINGS_KEY, value: hash },
  });

  console.log("✓ PIN-ul secțiunii „Conturi & Acces” a fost setat.");
  console.log("  cheie Settings :", SETTINGS_KEY);
  console.log("  stocare        : hash bcrypt (PIN-ul nu se salvează în clar)");
  console.log("  de acum înainte se poate schimba din tabul „Parola secțiunii”.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
