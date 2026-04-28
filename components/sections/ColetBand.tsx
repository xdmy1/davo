"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, ShieldCheck, Truck, Clock, Snowflake, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";

export default function ColetBand() {
  return (
    <section className="relative py-20 lg:py-24 bg-[color:var(--ink-50)]">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <Reveal>
            <ParcelMedia />
          </Reveal>

          <Reveal delay={0.1}>
            <span className="eyebrow">
              <span className="h-1.5 w-6 rounded-full bg-[color:var(--red-500)]" />
              Colete rapide
            </span>
            <h2 className="display-hero display-lg text-[color:var(--navy-900)] mt-4">
              Livrare colete
              <br />
              Moldova → Europa
            </h2>
            <p className="mt-5 text-[color:var(--ink-700)] leading-relaxed max-w-lg">
              Moldova → Europa. Trimite colete rapid și sigur cu Davo Group. Colectăm coletele
              direct din orașul tău, în toată Moldova, și le livrăm la destinație. Pentru
              produsele perisabile transportăm în remorcă frigorifică, la temperatură controlată.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {[
                { icon: MapPin, title: "Colectăm din toată Moldova", body: "Bălți, Cahul, Comrat, Ungheni, Orhei și restul țării" },
                { icon: Snowflake, title: "Remorcă frigorifică", body: "Pentru produse perisabile, temperatură controlată" },
                { icon: Truck, title: "De la ușă la ușă", body: "Preluare și livrare la adresă" },
                { icon: Clock, title: "Cursă zilnică", body: "Plecări regulate, la timp" },
                { icon: Package, title: "Orice dimensiune", body: "De la plicuri la 200+ kg" },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-3 rounded-xl border border-[color:var(--ink-200)] bg-white p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--navy-50)] text-[color:var(--navy-800)] shrink-0">
                    <b.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--navy-900)]">{b.title}</div>
                    <div className="text-xs text-[color:var(--ink-500)] mt-0.5">{b.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/rezervare?mode=colet"
                className="group inline-flex items-center gap-2 rounded-lg bg-[color:var(--red-500)] px-7 py-4 font-bold uppercase tracking-wider text-white text-sm hover:bg-[color:var(--red-600)] transition-colors shadow-[0_14px_30px_-10px_rgba(225,30,43,0.55)]"
              >
                Trimite colet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ParcelMedia() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* Priority chip */}
      <motion.div
        initial={{ opacity: 0, y: -10, rotate: -6 }}
        whileInView={{ opacity: 1, y: 0, rotate: -4 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute -top-2 left-4 z-10 rounded-full border-2 border-[color:var(--red-500)] bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[color:var(--red-500)] shadow-[0_10px_24px_-12px_rgba(225,30,43,0.55)]"
      >
        Priority
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative aspect-[5/4]"
      >
        <Image
          src="/images/parcel-boxes.png"
          alt="Colete DAVO Group"
          fill
          unoptimized
          sizes="(min-width: 1024px) 520px, 100vw"
          className="object-contain drop-shadow-[0_30px_35px_rgba(11,38,83,0.18)]"
        />
      </motion.div>
    </div>
  );
}
