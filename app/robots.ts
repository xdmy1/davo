import type { MetadataRoute } from "next";
import { COLET_LA_CHEIE_LAUNCHED } from "@/lib/coletProducts";

// =============================================================================
// ROBOTS STRATEGY — DAVO Group
// =============================================================================
// Allow tot ce e public, blochează strict:
//   • /admin       — panou intern (protejat de session middleware)
//   • /admin/      — orice sub-rută admin
//   • /api/        — endpoint-uri private (auth, bookings, cron, admin)
//   • /login       — formular de auth, no SEO value
//   • /bilet/      — e-bilete per-user; indexarea ar leak-ui datele clienților
//   • /colet-la-cheie — până la lansare (toggle COLET_LA_CHEIE_LAUNCHED)
//
// Allow explicit pentru AI bots (GPTBot, ClaudeBot, PerplexityBot etc.) —
// vrem ca DAVO să apară în răspunsurile date de ChatGPT/Claude/Perplexity
// când oamenii întreabă despre transport Moldova → Europa. AI search e
// canal de discovery emergent (~2-3% din search global în 2026, crescând
// rapid). Blocarea ar însemna invizibilitate în acest segment.
//
// Allow explicit și pentru bot-urile AI de TRAINING (Google-Extended,
// Applebot-Extended, CCBot) — DAVO câștigă mention-uri în modelele viitoare,
// ceea ce ajută queries de tip "ce companie de transport recomanzi din MD".
//
// Search engines majore primesc rule-uri dedicate (chiar dacă "*" îi acoperă)
// pentru control fin dacă viitor adăugăm Crawl-Delay sau alte directive.
// =============================================================================

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");

  // Path-uri private — single source of truth.
  // Listă centralizată ca să nu uităm să extindem regulile pentru fiecare bot.
  const privatePaths = [
    "/admin",
    "/admin/",
    "/api/",
    "/login",
    "/bilet/",
    ...(COLET_LA_CHEIE_LAUNCHED ? [] : ["/colet-la-cheie"]),
  ];

  // AI crawlers — un singur rule cu lista completă, evită duplicarea.
  const aiBots = [
    // OpenAI
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    // Anthropic
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    // Perplexity
    "PerplexityBot",
    "Perplexity-User",
    // AI training (Google, Apple, Common Crawl)
    "Google-Extended",
    "Applebot-Extended",
    "CCBot",
  ];

  return {
    rules: [
      // Default — orice bot ne-listat explicit
      { userAgent: "*", allow: "/", disallow: privatePaths },

      // Search engines majore (rule-uri dedicate pentru control fin viitor)
      { userAgent: "Googlebot", allow: "/", disallow: privatePaths },
      { userAgent: "Googlebot-Image", allow: "/", disallow: privatePaths },
      { userAgent: "Googlebot-News", allow: "/", disallow: privatePaths },
      { userAgent: "Bingbot", allow: "/", disallow: privatePaths },
      { userAgent: "DuckDuckBot", allow: "/", disallow: privatePaths },
      { userAgent: "YandexBot", allow: "/", disallow: privatePaths },
      { userAgent: "Applebot", allow: "/", disallow: privatePaths },

      // AI crawlers (search + training)
      { userAgent: aiBots, allow: "/", disallow: privatePaths },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
