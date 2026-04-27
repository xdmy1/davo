import type { MetadataRoute } from "next";
import { destinations, services } from "@/lib/data";
import { countryLandingUrl, cityPageUrl } from "@/lib/utils";

// Prioritățile reflectă valoarea de business + frecvența de actualizare:
// - "/" și "/rezervare" sunt landing-urile principale → 1.0 / 0.9
// - Pagini țări (5) sunt principalele targets SEO → 0.9
// - Pagini orașe (~150) sunt long-tail → 0.7
// - Pagini legale și tracking → 0.3-0.5
const STATIC_ROUTES: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFreq: "weekly" },
  { path: "/rezervare", priority: 0.9, changeFreq: "weekly" },
  { path: "/destinatii", priority: 0.9, changeFreq: "weekly" },
  { path: "/servicii", priority: 0.8, changeFreq: "monthly" },
  { path: "/despre-noi", priority: 0.7, changeFreq: "monthly" },
  { path: "/informatii-utile", priority: 0.7, changeFreq: "monthly" },
  { path: "/contact", priority: 0.6, changeFreq: "monthly" },
  { path: "/livrare", priority: 0.5, changeFreq: "monthly" },
  { path: "/colet-la-cheie", priority: 0.6, changeFreq: "monthly" },
  { path: "/rechizite-bancare", priority: 0.3, changeFreq: "yearly" },
  { path: "/termeni-pasageri", priority: 0.3, changeFreq: "yearly" },
  { path: "/termeni-colete", priority: 0.3, changeFreq: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
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

  // Pagini țări (5) — principalele targets SEO
  for (const d of destinations) {
    entries.push({
      url: `${base}${countryLandingUrl(d)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    });

    // Pagini orașe (~150) — long-tail destinații specifice
    for (const c of d.cities) {
      entries.push({
        url: `${base}${cityPageUrl(c, d)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
