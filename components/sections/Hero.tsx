"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bus,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn, countryLandingUrl } from "@/lib/utils";
import { destinations, moldovanCities } from "@/lib/data";
import { CountryFlag, countryMeta, type CountryCode } from "@/components/ui/CountryFlag";

type Tab = "transport" | "colete";
const flagOrder: CountryCode[] = ["gb", "de", "be", "nl", "lu"];

export default function Hero() {
  const [tab, setTab] = useState<Tab>("transport");
  const [serviceType, setServiceType] = useState("regular");
  const [from, setFrom] = useState("Chișinău");
  const [to, setTo] = useState("");

  const destinationCities = useMemo(
    () => destinations.flatMap((d) => d.cities.map((c) => ({ name: c.name, country: d.name }))),
    []
  );

  const searchHref = useMemo(() => {
    const params = new URLSearchParams({
      mode: tab === "transport" ? "bilet" : "colet",
      from,
      to,
    });
    return `/rezervare?${params.toString()}`;
  }, [tab, from, to]);

  return (
    <section className="relative overflow-hidden isolate bg-white">
      {/* Continuous background — gradient flows from hero through booking with no seam */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#eef3fb_55%,#dfe7f5_75%,#eef3fb_90%,#ffffff_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(225,30,43,0.10),transparent_65%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(11,38,83,0.08),transparent_65%)] blur-2xl"
      />

      {/* ============ DESKTOP-ONLY full-bleed bus (right edge) ============ */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="hidden md:block pointer-events-none absolute right-0 top-[60px] lg:top-[80px] z-[1] aspect-[16/10] w-[62vw] max-w-[1100px]"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-full w-full"
        >
          <Image
            src="/images/bus-angle.png"
            alt="DAVO Group tour bus"
            fill
            priority
            unoptimized
            sizes="62vw"
            className="object-contain object-right drop-shadow-[0_30px_35px_rgba(11,38,83,0.18)]"
          />
        </motion.div>
        {/* Live chip — positioned over the desktop bus */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="pointer-events-auto absolute left-6 top-6 flex items-center gap-2 rounded-full bg-white text-[color:var(--navy-900)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider shadow-[0_12px_30px_-12px_rgba(11,38,83,0.25)] ring-1 ring-[color:var(--ink-100)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-[color:var(--red-500)] animate-ping opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--red-500)]" />
          </span>
          Curse astăzi
        </motion.div>
      </motion.div>

      {/* ============ HERO (light, photo on right) ============ */}
      <div className="relative">
        <div className="container-page relative pt-8 md:pt-12 lg:pt-16 pb-20 md:pb-28 lg:pb-32">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
            {/* LEFT — copy */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 order-1 max-w-[620px]"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--navy-800)] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--red-500)]" />
                Davo Transport Europa
              </span>
              <h1 className="mt-5 display-hero text-[color:var(--navy-900)] leading-[0.95] tracking-[-0.02em] text-[clamp(2rem,5vw,4rem)]">
                TRANSPORT <span className="text-[color:var(--red-500)]">RAPID</span>
                <br />
                ȘI SIGUR CĂTRE{" "}
                <span className="relative inline-block">
                  EUROPA
                  <motion.span
                    aria-hidden
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                    className="absolute left-0 right-0 -bottom-1 h-[6px] origin-left rounded-full bg-[color:var(--red-500)]"
                  />
                </span>
              </h1>
              <p className="mt-5 max-w-[540px] text-[0.95rem] md:text-base text-[color:var(--ink-700)] leading-relaxed">
                Davo Group — lider în transport internațional de pasageri și colete. Călătorii
                sigure și livrări punctuale în Belgia, Germania, Olanda, Anglia și Moldova.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/rezervare"
                  className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-7 py-3.5 font-bold text-white text-sm uppercase tracking-wider hover:bg-[color:var(--red-600)] transition-colors shadow-[0_18px_40px_-12px_rgba(225,30,43,0.55)]"
                >
                  Rezervă acum
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#booking"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-6 py-3.5 text-sm font-semibold text-[color:var(--navy-900)] hover:border-[color:var(--navy-700)] hover:bg-[color:var(--navy-50)] transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-[color:var(--red-500)]" />
                  Caută curse
                </a>
              </div>

              <div className="mt-9 grid grid-cols-3 gap-4 max-w-md border-t border-[color:var(--ink-200)] pt-5">
                {[
                  { k: "12+", v: "ani experiență" },
                  { k: "150+", v: "destinații" },
                  { k: "50k+", v: "călători/an" },
                ].map((s) => (
                  <div key={s.v}>
                    <div className="font-[family-name:var(--font-montserrat)] text-2xl md:text-3xl font-extrabold tracking-tight text-[color:var(--navy-900)]">
                      {s.k}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-[color:var(--ink-500)] font-semibold">
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* RIGHT — bus (mobile only; desktop uses the full-bleed overlay above) */}
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative order-2 w-full md:hidden"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative mx-auto aspect-[16/10] w-full max-w-[680px]"
              >
                <Image
                  src="/images/bus-angle.png"
                  alt="DAVO Group tour bus"
                  fill
                  priority
                  unoptimized
                  sizes="100vw"
                  className="object-contain drop-shadow-[0_30px_35px_rgba(11,38,83,0.18)]"
                />
              </motion.div>

              {/* Live chip — mobile/tablet only, on top of the inline bus */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="absolute right-2 top-2 hidden sm:flex items-center gap-2 rounded-full bg-white text-[color:var(--navy-900)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider shadow-[0_12px_30px_-12px_rgba(11,38,83,0.25)] ring-1 ring-[color:var(--ink-100)]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-[color:var(--red-500)] animate-ping opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--red-500)]" />
                </span>
                Curse astăzi
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ============ BOOKING band (shares background) ============ */}
      <div id="booking" className="relative">
        <div className="container-page relative -mt-16 md:-mt-20 lg:-mt-24 pb-12 md:pb-16">
          {/* Booking card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
            className="relative z-10 rounded-3xl bg-white shadow-[0_40px_80px_-25px_rgba(11,38,83,0.35)] ring-1 ring-[color:var(--ink-100)] overflow-hidden"
          >
            {/* Tabs strip */}
            <div className="flex items-center gap-1 bg-[color:var(--ink-50)] px-3 pt-3">
              <TabButton active={tab === "transport"} onClick={() => setTab("transport")} icon={<Bus className="h-4 w-4" />}>
                Transport
              </TabButton>
              <TabButton active={tab === "colete"} onClick={() => setTab("colete")} icon={<Package className="h-4 w-4" />}>
                Colete
              </TabButton>
            </div>

            <div className="p-4 md:p-5">
              <AnimatePresence mode="wait">
                <motion.form
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="grid gap-2.5 md:grid-cols-[1.1fr,1fr,1fr,auto] items-stretch"
                >
                  <Field label="Tipul serviciului">
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full bg-transparent text-[0.95rem] font-semibold text-[color:var(--navy-900)] outline-none"
                    >
                      <option value="regular">Curse regulate</option>
                      <option value="express">Curse expres</option>
                      <option value="charter">Charter</option>
                    </select>
                  </Field>

                  <Field label="Plecare din" icon={<MapPin className="h-3.5 w-3.5" />}>
                    <CityInput
                      value={from}
                      onChange={setFrom}
                      options={moldovanCities.map((c) => c.name)}
                      placeholder="Chișinău"
                    />
                  </Field>

                  <Field label="Destinația" icon={<MapPin className="h-3.5 w-3.5" />}>
                    <CityInput
                      value={to}
                      onChange={setTo}
                      options={destinationCities.map((c) => `${c.name}, ${c.country}`)}
                      placeholder="Alege orașul"
                    />
                  </Field>

                  <Link
                    href={searchHref}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--red-500)] px-7 py-3.5 text-white font-bold text-[13px] uppercase tracking-wider hover:bg-[color:var(--red-600)] transition-colors shadow-[0_14px_30px_-10px_rgba(225,30,43,0.55)] md:whitespace-nowrap"
                  >
                    <Search className="h-4 w-4" />
                    Vezi cursele
                  </Link>
                </motion.form>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Country cards row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 md:mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 md:gap-3"
          >
            {flagOrder.map((code) => {
              const dest = destinations.find(
                (d) => d.slug === countryMeta[code].destinationSlug
              );
              const href = dest ? countryLandingUrl(dest) : "/destinatii";
              return (
              <Link
                key={code}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-[color:var(--ink-200)] bg-white px-3 py-3 transition-all hover:border-[color:var(--red-400)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(11,38,83,0.35)]"
              >
                <div className="h-10 w-14 shrink-0 shadow-[0_6px_14px_-6px_rgba(11,38,83,0.35)] rounded-sm overflow-hidden ring-1 ring-[color:var(--ink-100)]">
                  <CountryFlag code={code} className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-montserrat)] font-extrabold uppercase text-[color:var(--navy-900)] text-[13px] tracking-wider leading-none">
                    {countryMeta[code].label}
                  </div>
                  <div className="mt-1 text-[10px] text-[color:var(--ink-500)] uppercase tracking-wider font-semibold">
                    Rezervă loc
                  </div>
                </div>
              </Link>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex flex-col gap-0.5 rounded-lg border border-[color:var(--ink-200)] bg-white px-3 py-2 transition-colors hover:border-[color:var(--navy-700)] focus-within:border-[color:var(--red-500)] focus-within:ring-2 focus-within:ring-[color:var(--red-500)]/20">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[color:var(--ink-500)]">
        {icon && <span className="text-[color:var(--red-500)]">{icon}</span>}
        {label}
      </span>
      <div className="flex items-center">{children}</div>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 rounded-t-lg px-5 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors",
        active
          ? "text-[color:var(--red-500)] bg-white shadow-[0_-2px_0_0_var(--red-500)_inset]"
          : "text-[color:var(--ink-500)] hover:text-[color:var(--navy-900)]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function CityInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <>
      <input
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[0.95rem] font-semibold text-[color:var(--navy-900)] outline-none placeholder:text-[color:var(--ink-400)] placeholder:font-medium"
        placeholder={placeholder}
      />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
