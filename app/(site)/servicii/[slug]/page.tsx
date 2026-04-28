import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Check,
  Package,
  Phone,
  Car,
  Users,
  type LucideIcon,
} from "lucide-react";
import { contactInfo, services } from "@/lib/data";
import FAQ from "@/components/sections/FAQ";
import CollectionSchedule from "@/components/sections/CollectionSchedule";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { defaultFAQs } from "@/lib/faqs";
import {
  serviceSchema,
  breadcrumbSchema,
  faqPageSchema,
} from "@/lib/jsonLd";

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  package: Package,
  plane: Car,
  truck: Car,
  boxes: Boxes,
};

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const svc = services.find((s) => s.slug === slug);
  if (!svc) notFound();
  const Icon = iconMap[svc.icon] || Package;

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            slug: svc.slug,
            name: svc.title,
            description: svc.description,
            image: svc.image,
          }),
          breadcrumbSchema([
            { name: "Acasă", url: "/" },
            { name: "Servicii", url: "/servicii" },
            { name: svc.title, url: `/servicii/${svc.slug}` },
          ]),
          faqPageSchema(defaultFAQs),
        ]}
      />
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-20" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(225,30,43,0.18),transparent_65%)] blur-3xl"
        />
        <div className="container-page relative py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] items-center">
            <Reveal>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-400)]">
                Serviciu DAVO
              </div>
              <h1 className="mt-4 display-hero display-xl text-white">{svc.title}</h1>
              <p className="mt-5 text-lg text-white/70 max-w-xl leading-relaxed">{svc.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {svc.slug === "transport-de-marfa-pana-la-5-tone" ? (
                  <a
                    href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                  >
                    <Phone className="h-4 w-4" /> Solicită ofertă
                  </a>
                ) : (
                  <Link
                    href={svc.slug === "transport-de-colete" ? "/rezervare?mode=colet" : "/rezervare"}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                  >
                    {svc.slug === "transport-de-colete" ? "Trimite colet" : "Rezervă acum"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <a
                  href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Phone className="h-4 w-4" /> {contactInfo.phone}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              {svc.image ? (
                <div className="relative mx-auto w-full max-w-md aspect-[5/4]">
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    fill
                    priority
                    unoptimized
                    sizes="(min-width: 1024px) 480px, (min-width: 640px) 60vw, 90vw"
                    className="object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.45)]"
                  />
                </div>
              ) : (
                <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
                  <Icon className="h-20 w-20 text-white/70" strokeWidth={1.5} />
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page">
          <Reveal>
            <h2 className="display-hero display-md text-[color:var(--navy-900)]">
              Ce oferim prin acest serviciu
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {svc.features.map((f) => (
              <div
                key={f}
                className="flex items-start gap-3 rounded-xl border border-[color:var(--ink-200)] bg-white p-4"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)] shrink-0">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </div>
                <span className="text-[color:var(--ink-700)] font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {svc.slug === "transport-de-colete" && <CollectionSchedule />}

      <FAQ />
    </>
  );
}
