"use client";

import Link from "next/link";
import { Play, Bus, MapPin, Users } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { contactInfo } from "@/lib/data";

const cards = [
  {
    title: "Interiorul autocarului",
    tag: "BUS TOUR",
    icon: Bus,
    gradient: "from-[#0b2653] to-[#1d4ba0]",
  },
  {
    title: "Punctul de plecare",
    tag: "STATION",
    icon: MapPin,
    gradient: "from-[#1d4ba0] to-[#143a7a]",
  },
  {
    title: "Bord a companiei",
    tag: "TEAM",
    icon: Users,
    gradient: "from-[#0b2653] to-[#c41e2a]",
  },
];

export default function SocialDavo() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow">
                <span className="h-1.5 w-6 rounded-full bg-[color:var(--red-500)]" />
                Social DAVO Group
              </span>
              <h2 className="display-hero display-lg text-[color:var(--navy-900)] mt-4">
                Aruncă o privire
              </h2>
            </div>
            <Link
              href={contactInfo.social.tiktok}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-[color:var(--navy-900)] hover:text-[color:var(--red-500)] transition-colors"
            >
              Vezi toate videourile pe TikTok →
            </Link>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <button className="group relative block w-full overflow-hidden rounded-2xl aspect-[4/5] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--red-500)]">
                <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
                <div className="bg-noise absolute inset-0 opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <c.icon className="h-24 w-24 text-white/20 transition-transform group-hover:scale-110 duration-500" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <div className="absolute inset-x-0 top-0 p-5 flex items-center justify-between">
                  <span className="inline-flex items-center leading-none text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 px-2.5 h-7 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    {c.tag}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white">
                    <Play className="h-3.5 w-3.5 fill-white" />
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="font-[family-name:var(--font-montserrat)] font-extrabold uppercase text-lg leading-tight tracking-wider">
                    {c.title}
                  </div>
                  <div className="mt-1 text-xs text-white/70">DAVO Group · TikTok {contactInfo.social.handleTikTok}</div>
                </div>

                {/* hover play pulse */}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--red-500)] text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_20px_40px_-10px_rgba(225,30,43,0.6)]">
                  <Play className="h-6 w-6 fill-white" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
