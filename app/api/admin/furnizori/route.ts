import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Raport lunar per furnizor/agenție parteneră (pentru decontarea comisionului).
// Luna se referă la data PLECĂRII (departureDate) — agențiile vin cu raportul
// pentru pasagerii care au călătorit în luna respectivă, nu care au rezervat.
// Rezervările anulate nu intră în raport.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? "";
    const furnizor = searchParams.get("furnizor")?.trim() || null;

    let dateRange: { gte: Date; lt: Date } | undefined;
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      dateRange = {
        gte: new Date(Date.UTC(y, m - 1, 1)),
        lt: new Date(Date.UTC(y, m, 1)),
      };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        furnizor: furnizor ?? { not: null },
        status: { not: "cancelled" },
        ...(dateRange ? { departureDate: dateRange } : {}),
      },
      orderBy: { departureDate: "asc" },
      select: {
        id: true,
        bookingNumber: true,
        type: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        departureCity: true,
        arrivalCity: true,
        departureDate: true,
        adults: true,
        children: true,
        price: true,
        currency: true,
        furnizor: true,
      },
    });

    // Agregare per furnizor: rezervări, persoane, sume pe fiecare valută.
    const byName = new Map<
      string,
      { furnizor: string; bookings: number; persons: number; totals: Record<string, number> }
    >();
    for (const b of bookings) {
      const name = b.furnizor ?? "—";
      const row = byName.get(name) ?? { furnizor: name, bookings: 0, persons: 0, totals: {} };
      row.bookings += 1;
      row.persons += b.type === "passenger" ? b.adults + b.children : 0;
      row.totals[b.currency] = (row.totals[b.currency] ?? 0) + b.price;
      byName.set(name, row);
    }
    const summary = Array.from(byName.values()).sort((a, b) => b.persons - a.persons);

    // Toate numele de furnizori din istoric (pentru dropdown/datalist),
    // indiferent de luna selectată.
    const nameRows = await prisma.booking.findMany({
      where: { furnizor: { not: null } },
      distinct: ["furnizor"],
      select: { furnizor: true },
      orderBy: { furnizor: "asc" },
    });
    const names = nameRows.map((r) => r.furnizor).filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      summary,
      names,
      // Lista detaliată doar când e cerut un furnizor anume (pentru verificarea
      // raportului agenției rând cu rând).
      bookings: furnizor ? bookings : undefined,
    });
  } catch (error) {
    console.error("Admin furnizori error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load furnizori report" },
      { status: 500 }
    );
  }
}
