import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { destinations, moldovanCities } from "@/lib/data";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://davo.md";

// SEO keywords — generate dynamically from data so adding a city/destination
// automatically extends keyword coverage across the site.
const baseKeywords = [
  "DAVO",
  "DAVO Group",
  "DAVO Grup",
  "transport Moldova Europa",
  "autocar Moldova Europa",
  "autocar Chișinău Europa",
  "bilet autocar Moldova",
  "rezervare autocar online",
  "transport pasageri Moldova",
  "transport colete Moldova Europa",
  "colete perisabile",
  "remorcă frigorifică colete",
  "Wi-Fi Starlink autocar",
  "internet Starlink la bord",
  "însoțitoare bord autocar",
  "prânz gratuit autocar",
  "ceai cafea naturală autocar",
  "colectare colete Moldova",
  "punct colectare Calea Ieșilor",
  "tracking colete Moldova",
];

const moldovaCityKeywords = moldovanCities.flatMap((c) => [
  `transport ${c.name} Europa`,
  `autocar ${c.name}`,
  `colete ${c.name}`,
  `Moldova ${c.name} Anglia`,
  `Moldova ${c.name} Germania`,
]);

const destinationKeywords = destinations.flatMap((d) => [
  `transport Moldova ${d.name}`,
  `autocar ${d.name}`,
  `Moldova ${d.name} preț`,
  `bilet autocar Moldova ${d.name}`,
  `colete Moldova ${d.name}`,
  ...d.cities.slice(0, 8).map((c) => `transport Chișinău ${c.name}`),
]);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DAVO Group — Transport rapid și sigur Moldova → Europa",
    template: "%s | DAVO Group",
  },
  description:
    "Transport pasageri și colete din toată Moldova spre Anglia, Germania, Belgia, Olanda și Luxemburg. Autocare moderne cu Wi-Fi Starlink nelimitat, prânz gratuit, însoțitoare 24/7. Colete alterabile în remorcă frigorifică separată. Colectăm din toată Moldova.",
  applicationName: "DAVO Group",
  authors: [{ name: "DAVO Group", url: SITE_URL }],
  generator: "Next.js",
  keywords: [...baseKeywords, ...moldovaCityKeywords, ...destinationKeywords].join(", "),
  alternates: { canonical: "/" },
  openGraph: {
    title: "DAVO Group — Transport rapid și sigur Moldova → Europa",
    description:
      "Rezervă bilet sau trimite colet din toată Moldova spre Europa. Starlink nelimitat, prânz gratuit, remorcă frigorifică pentru perisabile, prețuri de la 120 Euro.",
    type: "website",
    locale: "ro_MD",
    siteName: "DAVO Group",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "DAVO Group — Transport Moldova → Europa",
    description:
      "Autocare cu Starlink, prânz gratuit, însoțitoare 24/7. Colete în remorcă frigorifică. Colectare din toată Moldova.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
