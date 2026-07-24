"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bus,
  Armchair,
  Snowflake,
  MonitorPlay,
  Utensils,
  Coffee,
  Wifi,
  Usb,
  Luggage,
  Briefcase,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Phone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { contactInfo } from "@/lib/data";
import { useLocale } from "@/lib/i18n/client";
import { dict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/config";

type AccentKey = "red" | "amber" | "blue" | "teal";
const ACCENTS: Record<AccentKey, { text: string; glow: string; chip: string; ring: string }> = {
  red: { text: "#f74a56", glow: "rgba(242,59,71,0.55)", chip: "rgba(242,59,71,0.14)", ring: "rgba(242,59,71,0.4)" },
  amber: { text: "#f7b733", glow: "rgba(247,183,51,0.5)", chip: "rgba(247,183,51,0.14)", ring: "rgba(247,183,51,0.4)" },
  blue: { text: "#5b9bff", glow: "rgba(91,155,255,0.5)", chip: "rgba(91,155,255,0.14)", ring: "rgba(91,155,255,0.4)" },
  teal: { text: "#12d3a4", glow: "rgba(18,196,155,0.5)", chip: "rgba(18,196,155,0.14)", ring: "rgba(18,196,155,0.4)" },
};

// Bento layout — referă (grup, item) din dict ca să păstreze textele localizate,
// dar controlează iconița, accentul, dimensiunea celulei și ordinea vizuală.
// Sumele pe rând tilează perfect pe 4 coloane (2+1+1 · 1+2+1 · 1+1+2 · 2+1+1).
const BENTO: { g: number; i: number; icon: LucideIcon; accent: AccentKey; feature?: boolean }[] = [
  { g: 2, i: 0, icon: Wifi, accent: "red", feature: true }, // Starlink
  { g: 2, i: 1, icon: Usb, accent: "red" }, // USB
  { g: 1, i: 0, icon: Utensils, accent: "amber" }, // Prânz
  { g: 1, i: 1, icon: Coffee, accent: "amber" }, // Ceai & cafea
  { g: 0, i: 0, icon: Bus, accent: "blue", feature: true }, // Autocare moderne
  { g: 0, i: 1, icon: Armchair, accent: "blue" }, // Scaune reclinabile
  { g: 0, i: 2, icon: Snowflake, accent: "blue" }, // Climatizare
  { g: 0, i: 3, icon: MonitorPlay, accent: "blue" }, // Multimedia
  { g: 3, i: 2, icon: UserCheck, accent: "teal", feature: true }, // Însoțitoare 24/24
  { g: 3, i: 0, icon: Luggage, accent: "teal", feature: true }, // 35 kg
  { g: 3, i: 1, icon: Briefcase, accent: "teal" }, // 5 kg mână
  { g: 3, i: 3, icon: ShieldCheck, accent: "teal" }, // Șoferi
];

const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};
const cardV: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

export default function FacilitatiClient() {
  const locale = useLocale();
  const f = dict(locale).facilitatiPage;
  const phoneTel = `tel:${contactInfo.phone.replace(/\s/g, "")}`;

  return (
    <div className="bg-[color:var(--navy-950)] text-white">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="bg-hero-navy absolute inset-0" />
        <div className="bg-noise absolute inset-0 opacity-40" />

        {/* blob-uri animate */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-6rem] h-[26rem] w-[26rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(242,59,71,0.35), transparent 65%)" }}
          animate={{ x: [0, -30, 0], y: [0, 24, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-[-8rem] left-[-6rem] h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(42,97,194,0.4), transparent 65%)" }}
          animate={{ x: [0, 36, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container-page relative py-14 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-white/80 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--red-500)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--red-500)]" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--red-400)]" />
              {f.eyebrow}
            </span>

            <h1 className="mt-5 display-hero display-xl bg-gradient-to-br from-white via-white to-[color:var(--red-400)] bg-clip-text text-transparent">
              {f.title}
            </h1>
            <div className="road-stripe mt-5 w-32 opacity-90" />
            <p className="mt-5 text-lg text-white/70 max-w-2xl leading-relaxed">{f.description}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={localePath(locale, "/rezervare")}
                className="animate-pulse-glow group inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
              >
                {f.ctaBook}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={phoneTel}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Phone className="h-4 w-4" /> {contactInfo.phone}
              </a>
            </div>
          </motion.div>

          {/* Statistici — compacte, animate în stagger */}
          <motion.div
            variants={gridContainer}
            initial="hidden"
            animate="show"
            transition={{ delayChildren: 0.3 }}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {f.stats.map((s) => (
              <motion.div
                key={s.label}
                variants={cardV}
                className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm px-5 py-4 text-center"
              >
                <div className="font-[family-name:var(--font-montserrat)] text-2xl md:text-3xl font-extrabold leading-none bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-white/50">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- BENTO FACILITĂȚI ---------- */}
      <section className="relative pb-4 pt-2">
        <div className="container-page">
          <motion.div
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3.5"
          >
            {BENTO.map((b) => {
              const item = f.groups[b.g].items[b.i];
              const groupLabel = f.groups[b.g].title;
              return (
                <BentoCard
                  key={item.title}
                  icon={b.icon}
                  accent={ACCENTS[b.accent]}
                  title={item.title}
                  body={item.body}
                  category={groupLabel}
                  feature={b.feature}
                />
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="pb-16 lg:pb-24 pt-8">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[28px] p-8 md:p-12"
            style={{ background: "linear-gradient(135deg,#c41e2a 0%,#e11e2b 55%,#f23b47 100%)" }}
          >
            <div className="bg-noise absolute inset-0 opacity-30" />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/20 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative grid gap-6 md:grid-cols-[1.5fr,1fr] md:items-center">
              <div>
                <h2 className="display-hero text-white text-[clamp(1.7rem,3.4vw,2.5rem)]">{f.ctaTitle}</h2>
                <p className="mt-3 text-white/85 max-w-lg">{f.ctaDescription}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={localePath(locale, "/rezervare")}
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-[color:var(--red-600)] shadow-[0_16px_36px_-14px_rgba(0,0,0,0.5)] hover:bg-white/90 transition-colors"
                >
                  {f.ctaBook}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href={phoneTel}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3.5 font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <Phone className="h-4 w-4" /> {f.ctaCall}
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function BentoCard({
  icon: Icon,
  accent,
  title,
  body,
  category,
  feature = false,
}: {
  icon: LucideIcon;
  accent: { text: string; glow: string; chip: string; ring: string };
  title: string;
  body: string;
  category: string;
  feature?: boolean;
}) {
  return (
    <motion.div
      variants={cardV}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative ${feature ? "col-span-2" : ""}`}
    >
      <div className="relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:p-5 backdrop-blur-sm transition-colors duration-300 hover:border-white/20">
        {/* glow accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
          style={{ background: accent.glow }}
        />
        {/* shimmer sweep pe hover (doar feature) */}
        {feature && (
          <div
            aria-hidden
            className="animate-shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}

        <div className="relative flex items-start justify-between gap-2">
          <div
            className={`flex items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
              feature ? "h-14 w-14" : "h-11 w-11"
            }`}
            style={{ background: accent.chip, color: accent.text, boxShadow: `inset 0 0 0 1px ${accent.ring}` }}
          >
            <Icon className={feature ? "h-7 w-7" : "h-5 w-5"} strokeWidth={1.8} />
          </div>
          <span className="mt-1 text-[9px] uppercase tracking-[0.18em] font-bold text-white/30">
            {category}
          </span>
        </div>

        <div
          className={`relative mt-3.5 font-[family-name:var(--font-montserrat)] font-bold text-white leading-tight ${
            feature ? "text-base md:text-lg" : "text-[0.95rem]"
          }`}
        >
          {title}
        </div>
        <div className={`relative mt-1.5 leading-relaxed text-white/55 ${feature ? "text-[13px]" : "text-[12px]"}`}>
          {body}
        </div>
      </div>
    </motion.div>
  );
}
