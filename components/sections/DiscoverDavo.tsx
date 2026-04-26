"use client";

import Link from "next/link";
import { ArrowRight, Bus, Award, Globe2 } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export default function DiscoverDavo() {
  return (
    <section className="relative py-20 lg:py-24 bg-[color:var(--ink-50)]">
      <div className="container-page">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--navy-800)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--red-500)]" />
            Despre noi
          </span>
          <h2 className="mt-4 display-hero text-[color:var(--navy-900)] text-[clamp(1.75rem,3.6vw,2.5rem)]">
            Descoperă DAVO Group
          </h2>
          <p className="mt-4 text-[color:var(--ink-700)] max-w-xl mx-auto">
            Operator de transport internațional cu peste 12 ani de experiență. Legăm Moldova de
            cele mai importante orașe europene printr-un serviciu construit pe încredere,
            punctualitate și confort.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          {[
            { icon: Bus, k: "Autocare moderne", v: "Clasa 3★, confort premium" },
            { icon: Globe2, k: "Acoperire Europa", v: "5 țări, 150+ destinații" },
            { icon: Award, k: "12 ani experiență", v: "Operator licențiat integral" },
          ].map((x, i) => (
            <Reveal key={x.k} delay={i * 0.05}>
              <div className="h-full rounded-2xl bg-white border border-[color:var(--ink-200)] p-5 transition-all hover:-translate-y-0.5 hover:border-[color:var(--red-400)] hover:shadow-[0_18px_38px_-20px_rgba(11,38,83,0.3)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--navy-900)] text-white">
                  <x.icon className="h-4 w-4" />
                </div>
                <div className="mt-4 font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)]">
                  {x.k}
                </div>
                <div className="mt-1 text-[13px] text-[color:var(--ink-500)]">{x.v}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10 flex justify-center">
          <Link
            href="/despre-noi"
            className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--navy-900)] px-7 py-3 text-white text-sm font-bold uppercase tracking-wider hover:bg-[color:var(--navy-800)] transition-colors"
          >
            Mai multe despre noi
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
