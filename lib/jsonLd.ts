// =============================================================================
// JSON-LD STRUCTURED DATA — DAVO Group
// =============================================================================
// Schemele Schema.org pe care le emit:
//
//  • Organization      — entitate juridică (DAVO GROUP S.R.L.) - global pe (site)
//  • LocalBusiness     — sediu fizic + orar, ajută la knowledge panel - global
//  • WebSite           — siteul în sine + SearchAction (sitelinks searchbox)
//  • Service           — pe paginile /servicii/[slug], descrie serviciul
//  • TouristTrip       — pe pagini țară, descrie ruta Moldova → [țară]
//  • FAQPage           — oriunde apar FAQ-uri (rich result accordion în SERP)
//  • BreadcrumbList    — pentru navigation breadcrumbs în Google
//
// Toate folosesc același @id schema (`${SITE_URL}#organization`) ca să Google
// să le linkeze ca aceeași entitate. Important pentru graful entities și
// agregare în Knowledge Panel.
//
// Resurse de referință:
//   https://developers.google.com/search/docs/appearance/structured-data
//   https://schema.org/Organization
//   https://schema.org/LocalBusiness
// =============================================================================

import { contactInfo } from "./data";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");

// Țările deservite — folosit ca areaServed în multiple scheme.
const SERVICE_AREAS = [
  { "@type": "Country", name: "Moldova" },
  { "@type": "Country", name: "United Kingdom" },
  { "@type": "Country", name: "Germany" },
  { "@type": "Country", name: "Belgium" },
  { "@type": "Country", name: "Netherlands" },
  { "@type": "Country", name: "Luxembourg" },
];

const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "str. Calea Ieșilor 11/3",
  addressLocality: "Chișinău",
  postalCode: "MD-2069",
  addressCountry: "MD",
};

// =========================================================================
// Organization — entitate juridică globală
// =========================================================================
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "DAVO Group",
    legalName: "DAVO GROUP S.R.L.",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo-davo.png`,
      width: 194,
      height: 52,
    },
    image: `${SITE_URL}/images/logo-davo.png`,
    description:
      "Transport pasageri și colete între Moldova și Anglia, Germania, Belgia, Olanda și Luxemburg. Autocare moderne cu Wi-Fi Starlink, prânz gratuit și însoțitoare 24/24.",
    address: POSTAL_ADDRESS,
    telephone: contactInfo.phone.replace(/\s/g, ""),
    email: contactInfo.email,
    taxID: "1013600041329", // IDNO
    vatID: "8601124",
    foundingDate: "2013",
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: contactInfo.phone.replace(/\s/g, ""),
        contactType: "customer service",
        areaServed: "MD",
        availableLanguage: ["Romanian", "Russian", "English"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+32484476446",
        contactType: "customer service",
        areaServed: ["BE", "NL", "LU"],
        availableLanguage: ["Romanian", "Russian"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+447447480276",
        contactType: "customer service",
        areaServed: "GB",
        availableLanguage: ["Romanian", "Russian", "English"],
      },
    ],
    areaServed: SERVICE_AREAS,
  };
}

// =========================================================================
// LocalBusiness — sediu + orar de colectare
// =========================================================================
// Folosim TravelAgency ca subtype pentru a câștiga rich result-uri specifice
// industriei călătoriilor. TravelAgency moștenește din LocalBusiness.
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${SITE_URL}/#localbusiness`,
    name: "DAVO Group",
    image: `${SITE_URL}/images/logo-davo.png`,
    url: SITE_URL,
    telephone: contactInfo.phone.replace(/\s/g, ""),
    email: contactInfo.email,
    address: POSTAL_ADDRESS,
    priceRange: "€€",
    areaServed: SERVICE_AREAS,
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    // Orar punct de colectare colete + îmbarcare la sediu
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Tuesday",
        opens: "09:00",
        closes: "14:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Wednesday",
        opens: "08:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Thursday",
        opens: "08:00",
        closes: "12:00",
      },
    ],
    sameAs: [
      // Acestea trebuie completate când clientul ne dă URL-urile reale.
      // Footer-ul folosește placeholder-e (https://facebook.com etc.) — le omit
      // ca să nu trimitem semnale false la Google.
    ],
  };
}

// =========================================================================
// WebSite — cu SearchAction pentru sitelinks searchbox în SERP
// =========================================================================
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "DAVO Group",
    url: SITE_URL,
    inLanguage: "ro-MD",
    publisher: { "@id": `${SITE_URL}/#organization` },
    // SearchAction permite Google să afișeze un searchbox sub link-ul site-ului.
    // /rezervare e cel mai apropiat search-like flow pe care îl avem.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/rezervare?to={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// =========================================================================
// BreadcrumbList — navigation breadcrumb în SERP
// =========================================================================
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
}

// =========================================================================
// FAQPage — accordion rich result în SERP
// =========================================================================
// IMPORTANT: items trebuie să fie EXACT FAQ-urile vizibile pe pagină.
// Google penalizează dacă schema include FAQ-uri care nu apar pe pagină.
export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
}

// =========================================================================
// Service — pe paginile /servicii/[slug]
// =========================================================================
export function serviceSchema({
  slug,
  name,
  description,
  image,
}: {
  slug: string;
  name: string;
  description: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/servicii/${slug}#service`,
    name,
    description,
    url: `${SITE_URL}/servicii/${slug}`,
    serviceType: name,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: SERVICE_AREAS,
    ...(image ? { image: `${SITE_URL}${image}` } : {}),
  };
}

// =========================================================================
// TouristTrip — pe paginile țară (rute Moldova → [țară])
// =========================================================================
export function touristTripSchema({
  countryName,
  countrySeoSlug,
  description,
  priceMin,
  priceCurrency,
}: {
  countryName: string;
  countrySeoSlug: string;
  description: string;
  priceMin?: string;
  priceCurrency?: string; // "GBP" | "EUR"
}) {
  const url = `${SITE_URL}/${countrySeoSlug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": `${url}#trip`,
    name: `Transport Moldova → ${countryName}`,
    description,
    url,
    provider: { "@id": `${SITE_URL}/#organization` },
    touristType: ["Diaspora moldovenească", "Pasageri", "Colete"],
    itinerary: [
      {
        "@type": "Place",
        name: "Chișinău, Moldova",
        address: POSTAL_ADDRESS,
      },
      {
        "@type": "Country",
        name: countryName,
      },
    ],
    ...(priceMin && priceCurrency
      ? {
          offers: {
            "@type": "Offer",
            price: priceMin,
            priceCurrency,
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/rezervare`,
          },
        }
      : {}),
  };
}
