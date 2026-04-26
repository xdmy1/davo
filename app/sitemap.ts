import type { MetadataRoute } from "next";
import { destinations, services } from "@/lib/data";
import { countryLandingUrl, cityPageUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = [
    "/",
    "/destinatii",
    "/servicii",
    "/contact",
    "/despre-noi",
    "/informatii-utile",
    "/rechizite-bancare",
    "/rezervare",
    "/livrare",
    "/termeni-pasageri",
    "/termeni-colete",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  // Servicii detaliate
  for (const s of services) {
    entries.push({
      url: `${base}/servicii/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Pagini țări (5)
  for (const d of destinations) {
    entries.push({
      url: `${base}${countryLandingUrl(d)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    // Pagini orașe (150+)
    for (const c of d.cities) {
      entries.push({
        url: `${base}${cityPageUrl(c, d)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
