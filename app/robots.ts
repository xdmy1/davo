import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/login",
          "/colet-la-cheie",
          "/bilet/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
