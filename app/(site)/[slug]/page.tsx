import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Bus,
  Package,
} from "lucide-react";
import { contactInfo, destinations, moldovanCities } from "@/lib/data";
import {
  CITY_URL_DIAMOND,
  cityPageSlug,
  cityPageUrl,
  countryLandingUrl,
} from "@/lib/utils";
import { CountryFlag, destinationSlugToCode } from "@/components/ui/CountryFlag";
import FAQ from "@/components/sections/FAQ";
import { Reveal } from "@/components/ui/Reveal";
import type { City, Destination } from "@/types";

// ============================================
// Static params — pre-render every country & city page at build time
// ============================================

export async function generateStaticParams() {
  const params: { slug: string }[] = [];

  for (const d of destinations) {
    params.push({ slug: d.seoSlug });
    for (const c of d.cities) {
      params.push({
        slug: `autocar-chisinau-moldova-${CITY_URL_DIAMOND}-${cityPageSlug(c, d)}`,
      });
    }
  }

  return params;
}

// ============================================
// Route resolution
// ============================================

type CountryRoute = { kind: "country"; destination: Destination };
type CityRoute = { kind: "city"; destination: Destination; city: City };
type Route = CountryRoute | CityRoute | null;

function resolveRoute(rawSlug: string): Route {
  // Next.js gives us the decoded slug (no %-encoding).
  const slug = decodeURIComponent(rawSlug);

  // Country landing page?
  const country = destinations.find((d) => d.seoSlug === slug);
  if (country) return { kind: "country", destination: country };

  // City page? Must start with the exact davo.md prefix.
  const cityPrefix = `autocar-chisinau-moldova-${CITY_URL_DIAMOND}-`;
  if (!slug.startsWith(cityPrefix)) return null;

  const tail = slug.slice(cityPrefix.length);
  for (const d of destinations) {
    for (const c of d.cities) {
      if (cityPageSlug(c, d) === tail) {
        return { kind: "city", destination: d, city: c };
      }
    }
  }

  return null;
}

// ============================================
// Metadata — per-page SEO title/description/canonical
// ============================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const route = resolveRoute(slug);
  if (!route) return {};

  if (route.kind === "country") {
    const { destination } = route;
    const title = `Transport Moldova - ${destination.name} pentru pasageri și colete`;
    const description = `${destination.description}. ${destination.cities.length} orașe disponibile. Plecări regulate din toată Moldova (Chișinău, Bălți, Cahul, Comrat, Ungheni, Orhei, Soroca). Wi-Fi Starlink, prânz gratuit, însoțitoare 24/24. Rezervă online la DAVO Group.`;
    const keywords = [
      `transport Moldova ${destination.name}`,
      `autocar Moldova ${destination.name}`,
      `bilet autocar ${destination.name}`,
      `colete Moldova ${destination.name}`,
      `Moldova ${destination.name} preț`,
      `Moldova ${destination.name} de la ${destination.price || "120"}${destination.currency}`,
      ...moldovanCities.slice(0, 8).map((c) => `transport ${c.name} ${destination.name}`),
      ...destination.cities.slice(0, 12).map((c) => `transport Chișinău ${c.name}`),
    ].join(", ");
    return {
      title,
      description,
      keywords,
      alternates: { canonical: `/${destination.seoSlug}` },
      openGraph: {
        title,
        description,
        type: "website",
        url: `/${destination.seoSlug}`,
      },
    };
  }

  const { city, destination } = route;
  const title = `Autocar Chișinău ⇋ ${city.name}, ${destination.name}`;
  const description = `Transport regulat Chișinău - ${city.name}, ${destination.name} de la ${destination.price || "120"}${destination.currency}. Internet Starlink nelimitat, prânz gratuit, însoțitoare de bord 24/24, remorcă frigorifică pentru colete perisabile. Rezervă online la DAVO Group.`;
  const keywords = [
    `autocar Chișinău ${city.name}`,
    `transport Moldova ${city.name}`,
    `Chișinău ${city.name}`,
    `bilet autocar ${city.name}`,
    `colete Chișinău ${city.name}`,
    `Moldova ${destination.name}`,
    `${city.name} ${destination.name}`,
    `transport ${city.name}`,
    ...moldovanCities.slice(0, 6).map((c) => `${c.name} ${city.name}`),
  ].join(", ");
  return {
    title,
    description,
    keywords,
    alternates: { canonical: cityPageUrl(city, destination) },
    openGraph: {
      title,
      description,
      type: "website",
      url: cityPageUrl(city, destination),
    },
  };
}

// ============================================
// Page
// ============================================

export default async function SeoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const route = resolveRoute(slug);
  if (!route) notFound();

  return route.kind === "country" ? (
    <CountryLanding destination={route.destination} />
  ) : (
    <CityPage city={route.city} destination={route.destination} />
  );
}

// ============================================
// Country landing page
// ============================================

function CountryLanding({ destination }: { destination: Destination }) {
  const code = destinationSlugToCode[destination.slug];
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: `DAVO Group — Transport Moldova ${destination.name}`,
    url: `${baseUrl}${countryLandingUrl(destination)}`,
    telephone: contactInfo.phone,
    email: contactInfo.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Calea Ieșilor 11/3",
      addressLocality: "Chișinău",
      addressCountry: "MD",
    },
    description: `${destination.description}. Plecări regulate din Moldova către ${destination.cities.length} orașe din ${destination.name}.`,
    areaServed: destination.cities.map((c) => ({
      "@type": "City",
      name: c.name,
      addressCountry: destination.name,
    })),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: destination.currency === "£" ? "GBP" : "EUR",
      lowPrice: destination.price || "120",
      offerCount: destination.cities.length,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="container-page relative py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] items-center">
            <Reveal>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-400)]">
                Transport Moldova — {destination.name}
              </div>
              <h1 className="mt-4 display-hero display-xl text-white">
                {destination.name.toUpperCase()}
              </h1>
              <p className="mt-5 text-lg text-white/70 max-w-xl leading-relaxed">
                {destination.description}. Plecări regulate din Chișinău către{" "}
                {destination.cities.length} orașe din {destination.name}.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/rezervare?to=${encodeURIComponent(destination.cities[0]?.name || "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                >
                  Rezervă bilet <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {contactInfo.phone}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex items-center justify-center lg:justify-end">
                <div className="relative">
                  {code && <CountryFlag code={code} className="h-36 w-52" />}
                  <div className="absolute -bottom-6 -right-6 rounded-full bg-[color:var(--red-500)] text-white shadow-lg px-5 py-3 text-sm font-bold flex flex-col items-center leading-tight">
                    <span className="text-[10px] uppercase tracking-widest opacity-80">
                      de la
                    </span>
                    <span className="font-[family-name:var(--font-montserrat)] text-2xl">
                      {destination.price || "—"}
                      {destination.currency}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[color:var(--ink-50)]">
        <div className="container-page">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="display-hero display-md text-[color:var(--navy-900)]">
                Orașe disponibile
              </h2>
              <div className="chip">
                <MapPin className="h-3.5 w-3.5" />
                {destination.cities.length} destinații
              </div>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {destination.cities.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i * 0.015, 0.3)}>
                <Link
                  href={cityPageUrl(c, destination)}
                  className="group flex items-center justify-between rounded-xl border border-[color:var(--ink-200)] bg-white px-4 py-3 transition-all hover:border-[color:var(--red-400)] hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-[color:var(--red-500)] shrink-0" />
                    <span className="font-semibold text-[color:var(--navy-900)] text-sm truncate">
                      {c.name}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[color:var(--ink-400)] transition-transform group-hover:translate-x-1 group-hover:text-[color:var(--red-500)]" />
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <CustomCityCTA destinationName={destination.name} />
          </Reveal>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page grid gap-5 md:grid-cols-3">
          {[
            { icon: Calendar, k: "Curse regulate", v: "De mai multe ori pe săptămână" },
            { icon: Clock, k: "Durată călătorie", v: "Între 20h și 40h" },
            {
              icon: ShieldCheck,
              k: "100% siguranță",
              v: "Autocare moderne, șoferi experimentați",
            },
          ].map((b) => (
            <div
              key={b.k}
              className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-6 flex items-start gap-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--navy-900)] shrink-0">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)]">
                  {b.k}
                </div>
                <div className="mt-1 text-sm text-[color:var(--ink-500)]">{b.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FAQ />
    </>
  );
}

// ============================================
// City destination page
// ============================================

function CityPage({
  city,
  destination,
}: {
  city: City;
  destination: Destination;
}) {
  const code = destinationSlugToCode[destination.slug];
  const otherCities = destination.cities.filter((c) => c.id !== city.id);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "BusTrip",
    name: `Autocar Chișinău - ${city.name}, ${destination.name}`,
    description: `Cursă regulată din Chișinău către ${city.name}. Autocare moderne cu Internet Starlink nelimitat, prânz gratuit, însoțitoare 24/24.`,
    departureBusStop: {
      "@type": "BusStation",
      name: "Chișinău (Calea Ieșilor 11/3)",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Calea Ieșilor 11/3",
        addressLocality: "Chișinău",
        addressCountry: "MD",
      },
    },
    arrivalBusStop: {
      "@type": "BusStation",
      name: city.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: city.name,
        addressCountry: destination.name,
      },
    },
    provider: {
      "@type": "Organization",
      name: "DAVO Group",
      telephone: contactInfo.phone,
      url: baseUrl,
    },
    offers: {
      "@type": "Offer",
      price: destination.price || "120",
      priceCurrency: destination.currency === "£" ? "GBP" : "EUR",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/rezervare?to=${encodeURIComponent(city.name)}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="container-page relative py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.25fr,1fr] items-center">
            <Reveal>
              <Link
                href={countryLandingUrl(destination)}
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-400)] hover:text-white transition-colors"
              >
                <ArrowRight className="h-3 w-3 rotate-180" />
                Transport Moldova — {destination.name}
              </Link>
              <h1 className="mt-4 display-hero display-xl text-white leading-[0.98]">
                Autocar Chișinău Moldova
                <br />
                <span className="text-[color:var(--red-400)]">⇋</span>{" "}
                {city.name}, {destination.name}
              </h1>
              <p className="mt-5 text-lg text-white/70 max-w-xl leading-relaxed">
                Cursă regulată din Chișinău către {city.name}. Autocare moderne, Wi-Fi, masă
                caldă și șoferi profesioniști — călătorie confortabilă de la poartă la poartă.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/rezervare?to=${encodeURIComponent(city.name)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                >
                  Rezervă bilet către {city.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/rezervare?mode=colet&to=${encodeURIComponent(city.name)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Package className="h-4 w-4" />
                  Trimite colet
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="relative w-full max-w-[440px] mx-auto lg:mr-0 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/15 p-6 md:p-7">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] font-bold text-white/60">
                  <span>Cursă directă</span>
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--red-400)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-[color:var(--red-500)] animate-ping opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--red-500)]" />
                    </span>
                    Live
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <CountryFlag code="md" className="h-9 w-14" />
                    <div className="mt-2 text-[10px] uppercase tracking-wider font-bold text-white/55">
                      Plecare
                    </div>
                    <div className="mt-0.5 font-[family-name:var(--font-montserrat)] font-extrabold text-white text-lg leading-tight">
                      Chișinău
                    </div>
                    <div className="text-[11px] text-white/55">Moldova</div>
                  </div>

                  <div className="shrink-0 flex flex-col items-center text-white/30">
                    <div className="h-px w-10 bg-white/20" />
                    <Bus className="my-1.5 h-4 w-4 text-[color:var(--red-400)]" />
                    <div className="h-px w-10 bg-white/20" />
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    {code && <CountryFlag code={code} className="h-9 w-14 ml-auto" />}
                    <div className="mt-2 text-[10px] uppercase tracking-wider font-bold text-white/55">
                      Destinație
                    </div>
                    <div className="mt-0.5 font-[family-name:var(--font-montserrat)] font-extrabold text-white text-lg leading-tight truncate">
                      {city.name}
                    </div>
                    <div className="text-[11px] text-white/55 truncate">{destination.name}</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                  <JourneyStat icon={Clock} label="Durată" value="~30h" />
                  <JourneyStat icon={Calendar} label="Frecvență" value="2–3/săpt" />
                  <JourneyStat
                    icon={Bus}
                    label="De la"
                    value={`${destination.price || "—"}${destination.currency}`}
                    accent
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page grid gap-5 md:grid-cols-3">
          {[
            { icon: Calendar, k: "Curse regulate", v: "Plecări de mai multe ori pe săptămână" },
            { icon: Clock, k: "Durată estimativă", v: "Între 20h și 40h în funcție de rută" },
            {
              icon: ShieldCheck,
              k: "De la ușă la ușă",
              v: "Preluare din localitate, livrare la adresă",
            },
          ].map((b) => (
            <div
              key={b.k}
              className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-6 flex items-start gap-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--navy-900)] shrink-0">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)]">
                  {b.k}
                </div>
                <div className="mt-1 text-sm text-[color:var(--ink-500)]">{b.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {otherCities.length > 0 && (
        <section className="py-16 bg-[color:var(--ink-50)]">
          <div className="container-page">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="display-hero display-md text-[color:var(--navy-900)]">
                  Alte orașe din {destination.name}
                </h2>
                <Link
                  href={countryLandingUrl(destination)}
                  className="text-sm font-semibold text-[color:var(--navy-900)] hover:text-[color:var(--red-500)] transition-colors"
                >
                  Vezi toate →
                </Link>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {otherCities.map((c, i) => (
                <Reveal key={c.id} delay={Math.min(i * 0.015, 0.3)}>
                  <Link
                    href={cityPageUrl(c, destination)}
                    className="group flex items-center justify-between rounded-xl border border-[color:var(--ink-200)] bg-white px-4 py-3 transition-all hover:border-[color:var(--red-400)] hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-[color:var(--red-500)] shrink-0" />
                      <span className="font-semibold text-[color:var(--navy-900)] text-sm truncate">
                        {c.name}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[color:var(--ink-400)] transition-transform group-hover:translate-x-1 group-hover:text-[color:var(--red-500)]" />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <FAQ />
    </>
  );
}

// ============================================
// CTA — orașul tău nu e în listă?
// ============================================

function CustomCityCTA({ destinationName }: { destinationName: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-[color:var(--navy-200,rgba(20,58,122,0.18))] bg-[color:var(--navy-50)] p-5 md:p-6 grid gap-4 md:grid-cols-[1fr,auto] items-center">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[color:var(--red-500)]">
          Orașul tău nu e în listă?
        </div>
        <p className="mt-1.5 text-sm md:text-base text-[color:var(--ink-700)] leading-relaxed">
          Aranjăm transport personalizat și către alte orașe din {destinationName}.
          Sună-ne sau scrie-ne — îți facem ofertă în câteva minute.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <a
          href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
        >
          <Phone className="h-4 w-4" />
          {contactInfo.phone}
        </a>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--navy-900)] hover:border-[color:var(--navy-700)] transition-colors"
        >
          Cere ofertă →
        </Link>
      </div>
    </div>
  );
}

// ============================================
// Journey stat (compact column used inside the city hero ticket)
// ============================================

function JourneyStat({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider font-bold text-white/55">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={
          "mt-1 font-[family-name:var(--font-montserrat)] font-extrabold text-[15px] leading-none " +
          (accent ? "text-[color:var(--red-400)]" : "text-white")
        }
      >
        {value}
      </div>
    </div>
  );
}
