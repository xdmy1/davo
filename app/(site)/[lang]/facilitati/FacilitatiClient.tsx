"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
  type LucideIcon,
} from "lucide-react";
import { contactInfo } from "@/lib/data";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/lib/i18n/client";
import { dict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/config";

// Iconițe paralele cu ordinea din `facilitatiPage.groups` (dict). Un icon per
// titlu de grup + o matrice de iconițe per item, în aceeași ordine.
const groupIcons: LucideIcon[] = [Bus, Utensils, Wifi, Luggage];
const itemIcons: LucideIcon[][] = [
  [Bus, Armchair, Snowflake, MonitorPlay],
  [Utensils, Coffee],
  [Wifi, Usb],
  [Luggage, Briefcase, UserCheck, ShieldCheck],
];

export default function FacilitatiClient() {
  const locale = useLocale();
  const t = dict(locale);
  const f = t.facilitatiPage;
  const phoneTel = `tel:${contactInfo.phone.replace(/\s/g, "")}`;

  return (
    <>
      {/* Hero — ton închis, la fel ca paginile de țară */}
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="container-page relative py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <span className="eyebrow text-[color:var(--red-400)]">
              <span className="h-1.5 w-6 rounded-full bg-[color:var(--red-500)]" />
              {f.eyebrow}
            </span>
            <h1 className="display-hero display-xl text-white mt-5">{f.title}</h1>
            <p className="mt-6 text-lg text-white/70 max-w-2xl leading-relaxed">{f.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={localePath(locale, "/rezervare")}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
              >
                {f.ctaBook} <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={phoneTel}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Phone className="h-4 w-4" /> {contactInfo.phone}
              </a>
            </div>
          </motion.div>

          {/* Bandă de statistici */}
          <Reveal delay={0.1} className="mt-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {f.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/[0.12] bg-white/5 backdrop-blur-sm px-5 py-4 text-center"
                >
                  <div className="font-[family-name:var(--font-montserrat)] text-2xl md:text-3xl font-extrabold text-white leading-none">
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-wider font-semibold text-white/55">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Grupuri de facilități */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container-page space-y-14">
          {f.groups.map((group, gi) => {
            const GroupIcon = groupIcons[gi] ?? Bus;
            return (
              <div key={group.title}>
                <Reveal>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--navy-900)] text-white shrink-0">
                      <GroupIcon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <h2 className="display-hero text-[color:var(--navy-900)] text-[clamp(1.4rem,2.6vw,2rem)]">
                      {group.title}
                    </h2>
                  </div>
                </Reveal>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((item, ii) => {
                    const Icon = itemIcons[gi]?.[ii] ?? ShieldCheck;
                    return (
                      <Reveal key={item.title} delay={ii * 0.04}>
                        <FacilityCard icon={Icon} title={item.title} body={item.body} />
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
      <section className="pb-16 lg:pb-24 bg-white">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px] bg-hero-navy p-8 md:p-12 text-white">
              <div className="bg-noise absolute inset-0 opacity-20" />
              <div className="relative grid gap-6 md:grid-cols-[1.4fr,1fr] md:items-center">
                <div>
                  <h2 className="display-hero text-white text-[clamp(1.6rem,3vw,2.25rem)]">{f.ctaTitle}</h2>
                  <p className="mt-3 text-white/70 max-w-lg">{f.ctaDescription}</p>
                </div>
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <Link
                    href={localePath(locale, "/rezervare")}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                  >
                    {f.ctaBook} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={phoneTel}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    <Phone className="h-4 w-4" /> {f.ctaCall}
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function FacilityCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="group h-full rounded-2xl border border-[color:var(--ink-200)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[color:var(--red-400)] hover:shadow-[0_20px_40px_-20px_rgba(11,38,83,0.25)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--navy-800)] transition-colors group-hover:bg-[color:var(--red-50)] group-hover:text-[color:var(--red-500)]">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="mt-4 font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)] text-[0.95rem] leading-tight">
        {title}
      </div>
      <div className="mt-1.5 text-[12.5px] text-[color:var(--ink-500)] leading-relaxed">{body}</div>
    </div>
  );
}
