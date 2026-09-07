import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateGeo } from "@/lib/geo";

// Rescrie ordinea orașelor unei țări: `ids` în ordinea dorită → sortOrder = index.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: unknown = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x) => typeof x === "string")) {
      return NextResponse.json({ success: false, error: "ids required" }, { status: 400 });
    }
    const list = ids as string[];
    const cities = await prisma.city.findMany({ where: { id: { in: list } }, select: { id: true, countryId: true } });
    if (cities.length !== list.length) {
      return NextResponse.json({ success: false, error: "Unele orașe nu mai există — reîncarcă pagina." }, { status: 409 });
    }
    if (new Set(cities.map((c) => c.countryId)).size !== 1) {
      return NextResponse.json({ success: false, error: "Ordinea se schimbă doar în cadrul aceleiași țări." }, { status: 400 });
    }
    await prisma.$transaction(
      list.map((id, i) => prisma.city.update({ where: { id }, data: { sortOrder: i } }))
    );
    revalidateGeo();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin/cities/reorder POST", error);
    return NextResponse.json({ success: false, error: "Nu s-a putut salva ordinea" }, { status: 500 });
  }
}
