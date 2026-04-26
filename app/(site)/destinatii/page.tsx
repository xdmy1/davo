import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import PageHero from "@/components/sections/PageHero";
import CountryCityTabs from "@/components/sections/CountryCityTabs";
import { Reveal } from "@/components/ui/Reveal";
import { destinations } from "@/lib/data";
import { countryLandingUrl } from "@/lib/utils";
import { CountryFlag, destinationSlugToCode } from "@/components/ui/CountryFlag";

export const metadata = {
  title: "Destinații | DAVO Group",
  description: "Toate destinațiile DAVO Group din Moldova spre Europa.",
};

export default function DestinatiiPage() {
  return (
    <>
      <PageHero
        eyebrow="Destinații"
        title={
          <>
            Cinci țări, <span className="text-[color:var(--red-500)]">150+ orașe</span>
          </>
        }
        description="Toată Europa la îndemână, cu plecări regulate din Moldova. Alege țara, alege orașul — alege DAVO."
      />

      <section className="py-10">
        <div className="container-page">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d, i) => {
              const code = destinationSlugToCode[d.slug];
              return (
                <Reveal key={d.slug} delay={i * 0.05}>
                  <Link
                    href={countryLandingUrl(d)}
                    className="group relative block overflow-hidden rounded-3xl border border-[color:var(--ink-200)] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[color:var(--red-400)] hover:shadow-[0_20px_40px_-20px_rgba(11,38,83,0.4)]"
                  >
                    {code && <CountryFlag code={code} className="h-14 w-20" />}
                    <div className="mt-5">
                      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--ink-500)]">
                        Moldova → {d.name}
                      </div>
                      <div className="mt-2 display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">
                        {d.name}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--ink-500)] line-clamp-2">{d.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[color:var(--ink-500)] font-bold">
                          De la
                        </div>
                        <div className="font-[family-name:var(--font-montserrat)] font-extrabold text-[color:var(--red-500)] text-xl">
                          {d.price || "—"} {d.currency}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[color:var(--ink-500)]">
                        <MapPin className="h-3.5 w-3.5" />
                        {d.cities.length} orașe
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[color:var(--navy-900)]">
                      Vezi orașele
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <CountryCityTabs />
    </>
  );
}
