import Link from "next/link";
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
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="container-page relative py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] items-center">
            <Reveal>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-400)]">
                Serviciu DAVO
              </div>
              <h1 className="mt-4 display-hero display-xl text-white">{svc.title}</h1>
              <p className="mt-5 text-lg text-white/70 max-w-xl leading-relaxed">{svc.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/rezervare"
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                >
                  Rezervă acum <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Phone className="h-4 w-4" /> {contactInfo.phone}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="relative aspect-square max-w-sm mx-auto">
                <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm border border-white/15" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon className="h-40 w-40 text-white/30" />
                </div>
              </div>
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
