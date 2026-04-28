import type { MetadataRoute } from "next";
import { destinations, services } from "@/lib/data";
import { COLET_LA_CHEIE_LAUNCHED } from "@/lib/coletProducts";
import { countryLandingUrl, cityPageUrl } from "@/lib/utils";

// =============================================================================
// SITEMAP STRATEGY — DAVO Group
// =============================================================================
// Construit pentru a maximiza ranking-ul pe queries:
//   • "transport Moldova [țară]"          → country landings  (priority 0.95)
//   • "autocar Chișinău [oraș]"           → city pages tier-1 (0.85) / tier-2 (0.7)
//   • "transport pasageri/colete Moldova" → service pages    (0.85, cu images)
//   • "rezervare bilet autocar"           → /rezervare       (0.95)
//   • "DAVO Group"                         → home + about    (1.0 / 0.75)
//
// Decizii cheie:
//  - Cache 24h (revalidate=86400). Datele sunt în lib/data.ts (build-time);
//    când admin trece pe DB pentru rute, refresh-ul se face natural pe build.
//  - lastModified = build time. Google îl folosește ca hint de freshness;
//    paginile dinamice (țări/orașe) primesc același lastModified ca site-ul.
//  - Tier-1 cities (capitale + diaspora MD mare) primesc priority 0.85
//    (vs 0.7 default). Google crawlează mai des paginile cu priority mare,
//    deci câștigă fresh-content boost pe rutele importante.
//  - changeFrequency e semnal slab — Google preferă lastModified. Îl punem
//    realist (weekly pentru rute, monthly pentru servicii, yearly pentru T&C).
//  - `images:` field îmbunătățește afișarea în Google Image Search și
//    Discover. Doar pentru pagini cu imagini reale (servicii) — destinations
//    referă /images/anglia.jpg etc. care încă nu există.
//  - /colet-la-cheie e exclus până la lansare (vezi COLET_LA_CHEIE_LAUNCHED).
//  - /bilet/[nr] e exclus mereu — e privat per-user, indexarea ar leak-ui
//    cine călătorește unde.
//
// Limite Google: 50.000 URL-uri / 50 MB per sitemap. Cu ~110 entries acum
// (5 țări × ~20 orașe + ~15 statice) suntem departe; nu e nevoie de split.
// =============================================================================

export const revalidate = 86400;

// Tier-1: capitale + orașe cu cea mai mare diaspora moldovenească.
// Sursa: estimări din rapoarte ASP / IOM Moldova privind comunitățile MD în UE.
const TIER_1_CITY_SLUGS = new Set([
  // UK — cea mai mare diaspora MD în Europa de Vest (~30k+ în zona Londra
  // și ~15k în Midlands: Leicester, Nottingham, Birmingham)
  "london",
  "manchester",
  "birmingham",
  "leicester",
  "nottingham",
  "cambridge",
  "peterborough",
  // Germania — concentrare în Frankfurt, regiunea Ruhr
  "frankfurt-am-main",
  "koln",
  "dusseldorf",
  "essen",
  "munster",
  // Belgia — Bruxelles + Antwerpen
  "bruxelles",
  "antwerpen",
  "gent",
  "liege",
  // Olanda — Randstad
  "amsterdam",
  "rotterdam",
  "den-haag",
  "utrecht",
  "eindhoven",
  // Luxemburg — singura comunitate
  "luxembourg-city",
]);

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  // Conversie + home — primele indexate
  { path: "/", priority: 1.0, changeFreq: "daily" },
  { path: "/rezervare", priority: 0.95, changeFreq: "daily" },

  // Hub-uri de descoperire
  { path: "/destinatii", priority: 0.9, changeFreq: "weekly" },
  { path: "/servicii", priority: 0.9, changeFreq: "weekly" },

  // Trust + E-E-A-T (Experience, Expertise, Authoritativeness, Trust)
  { path: "/despre-noi", priority: 0.75, changeFreq: "monthly" },
  { path: "/contact", priority: 0.75, changeFreq: "monthly" },

  // Utility
  { path: "/informatii-utile", priority: 0.7, changeFreq: "monthly" },
  { path: "/livrare", priority: 0.7, changeFreq: "weekly" },

  // Legal — schimbă rar, prioritate joasă
  { path: "/rechizite-bancare", priority: 0.4, changeFreq: "yearly" },
  { path: "/termeni-pasageri", priority: 0.3, changeFreq: "yearly" },
  { path: "/termeni-colete", priority: 0.3, changeFreq: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // 1. Pagini statice
  for (const r of STATIC_ROUTES) {
    entries.push({
      url: `${base}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFreq,
      priority: r.priority,
    });
  }

  // 2. /colet-la-cheie — doar la lansare (până atunci e noindex în metadata)
  if (COLET_LA_CHEIE_LAUNCHED) {
    entries.push({
      url: `${base}/colet-la-cheie`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  // 3. Pagini servicii — ranking pe "transport pasageri/colete/mărfuri Moldova"
  for (const s of services) {
    entries.push({
      url: `${base}/servicii/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
      ...(s.image ? { images: [`${base}${s.image}`] } : {}),
    });
  }

  // 4. Country landings — TARGET-ele principale ("transport Moldova [țară]")
  // 5. City pages — long-tail ("autocar Chișinău [oraș]")
  for (const d of destinations) {
    entries.push({
      url: `${base}${countryLandingUrl(d)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    });

    for (const c of d.cities) {
      entries.push({
        url: `${base}${cityPageUrl(c, d)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: TIER_1_CITY_SLUGS.has(c.slug) ? 0.85 : 0.7,
      });
    }
  }

  return entries;
}
