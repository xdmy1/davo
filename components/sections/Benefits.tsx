"use client";

import Image from "next/image";
import {
  UserCheck,
  Luggage,
  Coffee,
  Utensils,
  Wifi,
  MonitorPlay,
  Usb,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

type Benefit = { icon: LucideIcon; title: string; body: string };

const benefits: Benefit[] = [
  { icon: UserCheck, title: "Însoțitoare 24/24", body: "Asistență permanentă pe tot parcursul călătoriei" },
  { icon: Utensils, title: "Prânz gratuit", body: "Inclus din partea companiei pentru fiecare pasager" },
  { icon: Coffee, title: "Ceai & cafea naturală", body: "Servire nelimitată pe toată durata cursei" },
  { icon: Wifi, title: "Internet Starlink nelimitat", body: "Conexiune prin satelit, fără restricții, pe toată ruta" },
  { icon: Luggage, title: "Bagaj gratuit", body: "35 kg bagaj de cală inclus per pasager" },
  { icon: Usb, title: "Prize USB", body: "Încărcare la fiecare scaun" },
  { icon: MonitorPlay, title: "Sistem multimedia", body: "Ecrane și divertisment personal" },
  { icon: ShieldCheck, title: "Șoferi profesioniști", body: "Echipă experimentată, instruită impecabil" },
];

export default function Benefits() {
  return (
    <section className="relative py-20 lg:py-24 bg-white">
      <div className="container-page">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-[color:var(--navy-50)] px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--navy-800)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--red-500)]" />
            La bord
          </span>
          <h2 className="mt-4 display-hero text-[color:var(--navy-900)] text-[clamp(1.75rem,3.6vw,2.5rem)]">
            Beneficii de transport
          </h2>
          <p className="mt-4 text-[color:var(--ink-700)] max-w-xl mx-auto">
            Fiecare detaliu e gândit pentru o călătorie confortabilă, sigură și fără griji.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr,1.1fr] lg:gap-14 items-center">
          {/* Bus — visual anchor */}
          <Reveal className="relative">
            <div className="relative rounded-[32px] bg-[linear-gradient(160deg,#f4f7fc_0%,#e7eef9_100%)] p-6 md:p-8 ring-1 ring-[color:var(--ink-200)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,rgba(225,30,43,0.08),transparent_60%)]" />
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[320px]">
                <Image
                  src="/images/bus-front.png"
                  alt="DAVO Group bus front view"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 320px, 60vw"
                  className="object-contain drop-shadow-[0_30px_35px_rgba(11,38,83,0.18)]"
                />
              </div>

              {/* Floating stat card */}
              <div className="absolute left-4 bottom-4 md:left-6 md:bottom-6 rounded-2xl bg-white/95 backdrop-blur-sm ring-1 ring-[color:var(--ink-100)] shadow-[0_18px_40px_-18px_rgba(11,38,83,0.35)] px-4 py-3">
                <div className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold text-[color:var(--navy-900)] leading-none">
                  4,8<span className="text-[color:var(--red-500)]">★</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider font-semibold text-[color:var(--ink-500)]">
                  Rating pasageri
                </div>
              </div>

              {/* Floating class chip */}
              <div className="absolute right-4 top-4 md:right-6 md:top-6 rounded-full bg-[color:var(--navy-900)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-white">
                Clasa Business
              </div>
            </div>
          </Reveal>

          {/* Benefits grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.04}>
                <BenefitCard item={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ item }: { item: Benefit }) {
  const Icon = item.icon;
  return (
    <div className="group relative h-full rounded-2xl border border-[color:var(--ink-200)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[color:var(--red-400)] hover:shadow-[0_20px_40px_-20px_rgba(11,38,83,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--navy-800)] transition-colors group-hover:bg-[color:var(--red-50)] group-hover:text-[color:var(--red-500)]">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)] text-[0.95rem] leading-tight">
            {item.title}
          </div>
          <div className="mt-1 text-[12px] text-[color:var(--ink-500)] leading-relaxed">
            {item.body}
          </div>
        </div>
      </div>
    </div>
  );
}
