import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lista de orașe se schimbă rar (doar când admin adaugă manual). Cache-uim
// agresiv la edge: 5 min fresh, 1 oră stale-while-revalidate. Browser-ul și
// CDN-ul Vercel servesc răspunsul cached fără să mai cheme funcția.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: [{ isOrigin: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        isOrigin: true,
        country: { select: { name: true, slug: true } },
      },
    });

    const origins = [];
    const destinations = [];
    for (const c of cities) {
      const row = {
        id: c.id,
        name: c.name,
        slug: c.slug,
        countryName: c.country.name,
        countrySlug: c.country.slug,
      };
      if (c.isOrigin) origins.push(row);
      else destinations.push(row);
    }

    return NextResponse.json(
      { success: true, origins, destinations },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("public/cities GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load cities" },
      { status: 500 }
    );
  }
}
