import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Boxes } from "lucide-react";
import PageHero from "@/components/sections/PageHero";
import CountryCityTabs from "@/components/sections/CountryCityTabs";
import SocialDavo from "@/components/sections/SocialDavo";
import { Reveal } from "@/components/ui/Reveal";

const cards = [
  {
    slug: "transport-de-persoane",
    eyebrow: "01",
    title: "Transport de persoane",
    body: "Transportul internațional de persoane este principala activitate a companiei noastre. Plecări regulate în Anglia, Germania, Belgia, Olanda și Luxembourg cu autocare moderne, confort premium și șoferi experimentați.",
    cta: "Rezervă loc",
    href: "/rezervare",
    tone: "navy" as const,
    image: "/images/bus-angle.png",
  },
  {
    slug: "transport-de-colete",
    eyebrow: "02",
    title: "Transport de colete",
    body: "Trimite colete în siguranță la ușa destinatarului. Urmărire pas cu pas, asigurare inclusă și livrare de la adresă la adresă, prin curse regulate. Preluăm de la tine și livrăm în toată Europa.",
    cta: "Trimite colet",
    href: "/rezervare?mode=colet",
    tone: "red" as const,
    image: "/images/parcel-boxes.png",
  },
  {
    slug: "colet-la-cheie",
    eyebrow: "03",
    title: "Transport colete la cheie",
    body: "Serviciu complet pentru expedierea coletelor voluminoase sau a bunurilor cu valoare mare — ambalare, documente, livrare la destinație. Ne ocupăm noi de tot, tu primești confirmarea.",
    cta: "Comandă online",
    href: "/rezervare?mode=colet",
    tone: "navy" as const,
    image: "/images/parcel-boxes.png",
  },
];

const more = [
  {
    icon: Boxes,
    title: "Transport mărfuri până la 5 t",
    body: "Transport internațional de mărfuri, livrare rapidă, preț negociabil.",
  },
];

export default function ServiciiPage() {
  return (
    <>
      <PageHero
        eyebrow="Serviciile noastre"
        title={
          <>
            Serviciile <span className="text-[color:var(--red-500)]">noastre</span>
          </>
        }
        description="DAVO Group oferă o gamă completă de servicii de transport pentru pasageri și colete între Moldova și Europa. Alege ce ți se potrivește."
      />

      <CountryCityTabs />

      <section className="py-10 lg:py-16">
        <div className="container-page space-y-6 md:space-y-8">
          {cards.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.05}>
              <div
                className={`group relative grid gap-8 md:grid-cols-[1.1fr,1.4fr] items-stretch rounded-3xl overflow-hidden border ${
                  c.tone === "red"
                    ? "bg-[color:var(--red-500)] border-[color:var(--red-500)] text-white"
                    : "bg-[color:var(--navy-900)] border-[color:var(--navy-900)] text-white"
                }`}
              >
                <div className="bg-noise absolute inset-0 opacity-15" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 hidden md:block h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_65%)] blur-3xl"
                />
                <div className="relative p-8 md:p-10 flex flex-col justify-center">
                  <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70 mb-3">
                    SERVICIU {c.eyebrow}
                  </div>
                  <h2 className="display-hero text-3xl md:text-4xl lg:text-5xl text-white">{c.title}</h2>
                  <p className="mt-5 text-white/75 leading-relaxed max-w-md">{c.body}</p>
                  <div className="mt-7">
                    <Link
                      href={c.href}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-[color:var(--navy-900)] hover:bg-white/90 transition-colors"
                    >
                      {c.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="relative min-h-[240px] md:min-h-[300px] flex items-center justify-center px-6 pb-8 md:px-8 md:py-10">
                  <Image
                    src={c.image}
                    alt={c.title}
                    width={520}
                    height={390}
                    unoptimized
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="relative h-auto w-full max-w-[460px] object-contain transition-transform duration-500 group-hover:scale-[1.04] drop-shadow-[0_28px_40px_rgba(0,0,0,0.35)]"
                  />
                  <div className="absolute bottom-4 right-4 md:bottom-5 md:right-5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/90 border border-white/20">
                    DAVO Group
                  </div>
                </div>
              </div>
            </Reveal>
          ))}

          {more.length > 0 && (
            <Reveal>
              <div className="grid md:grid-cols-2 gap-5 mt-4">
                {more.map((m) => (
                  <div
                    key={m.title}
                    className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-6 flex items-start gap-4 hover:border-[color:var(--red-400)] transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--navy-900)] shrink-0">
                      <m.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)]">
                        {m.title}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--ink-500)]">{m.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <SocialDavo />
    </>
  );
}
