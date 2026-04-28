import Link from "next/link";
import { ArrowRight, Award, Bus, Globe2, Heart, ShieldCheck, Users } from "lucide-react";
import PageHero from "@/components/sections/PageHero";
import DiscoverDavo from "@/components/sections/DiscoverDavo";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "Despre noi | DAVO Group",
  description: "Despre DAVO Group — operator internațional de transport Moldova - Europa.",
};

const values = [
  { icon: ShieldCheck, title: "Siguranță", body: "Autocare verificate, șoferi profesioniști, rute atent planificate." },
  { icon: Users, title: "Clienți în centru", body: "Experiența ta contează — de la rezervare până la destinație." },
  { icon: Heart, title: "Pasiune", body: "Iubim ceea ce facem și asta se simte în fiecare cursă." },
  { icon: Globe2, title: "Europa aproape", body: "Conectăm Moldova cu 5 țări și peste 150 de orașe." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Despre DAVO"
        title={
          <>
            Operator internațional de{" "}
            <span className="text-[color:var(--red-500)]">transport</span>
          </>
        }
        description="De peste 12 ani construim o companie pe care călătorii o recomandă cu încredere. Investim constant în flotă, tehnologie și oameni."
      />

      <section className="py-16">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr,1fr] lg:gap-16 items-center">
            <Reveal>
              <h2 className="display-hero display-md text-[color:var(--navy-900)]">
                Povestea DAVO Group
              </h2>
              <div className="mt-5 space-y-4 text-[color:var(--ink-700)] leading-relaxed">
                <p>
                  Am pornit în 2013 cu o idee simplă: să facem drumul dintre Moldova și Europa mai sigur, mai confortabil și mai ușor. În 12 ani, ideea a crescut într-o companie cu zeci de autocare, curse regulate și mii de călători mulțumiți anual.
                </p>
                <p>
                  Astăzi legăm Chișinăul de Londra, Frankfurt, Bruxelles, Amsterdam, Luxembourg — și încă zeci de orașe din Anglia, Germania, Belgia, Olanda. Fiecare cursă e un angajament: punctualitate, confort și siguranță.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/rezervare"
                  className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                >
                  Rezervă bilet
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-6 py-3.5 font-semibold text-[color:var(--navy-900)] hover:border-[color:var(--navy-700)] transition-colors"
                >
                  Contactează-ne
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { k: "12+", v: "ani experiență", icon: Award },
                  { k: "150+", v: "destinații", icon: Globe2 },
                  { k: "50k+", v: "pasageri/an", icon: Users },
                  { k: "30+", v: "autocare moderne", icon: Bus },
                ].map((s) => (
                  <div
                    key={s.v}
                    className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-5 hover:border-[color:var(--red-400)] transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--navy-900)]">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 font-[family-name:var(--font-montserrat)] text-3xl font-extrabold text-[color:var(--navy-900)]">
                      {s.k}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--ink-500)]">{s.v}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[color:var(--ink-50)]">
        <div className="container-page">
          <Reveal>
            <div className="max-w-2xl">
              <span className="eyebrow">
                <span className="h-1.5 w-6 rounded-full bg-[color:var(--red-500)]" />
                Valorile noastre
              </span>
              <h2 className="display-hero display-md text-[color:var(--navy-900)] mt-4">
                Ce ne definește
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl bg-white border border-[color:var(--ink-200)] p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--red-500)] text-white">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)]">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--ink-500)]">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <DiscoverDavo hideCta />
    </>
  );
}
