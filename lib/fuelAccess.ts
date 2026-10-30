import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/session";
import { fuelAccessOf, type FuelAccess } from "@/lib/permissions";

export type { FuelAccess };

/**
 * Ce poate face userul logat în rezervor: "full" (secțiunea „fuel”), "take" (doar alimentare,
 * „fuel_take”) sau null. Proxy-ul lasă ambele să intre pe /api/admin/fuel; restrângerea e aici.
 */
export async function fuelAccess(req: NextRequest): Promise<FuelAccess> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return null;
  const user = await prisma.adminUser.findUnique({
    where: { email: session.email },
    select: { role: true, permissions: true, active: true },
  });
  if (!user || !user.active) return null;
  return fuelAccessOf(user.role, user.permissions);
}
