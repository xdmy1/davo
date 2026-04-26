"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { destinations } from "@/lib/data";
import { cn } from "@/lib/utils";
import { CountryFlag, destinationSlugToCode, countryMeta } from "@/components/ui/CountryFlag";
import { Reveal } from "@/components/ui/Reveal";

export default function CountryCityTabs() {
  const [active, setActive] = useState(destinations[0].slug);
  const activeDest = destinations.find((d) => d.slug === active) ?? destinations[0];

  return (
    <section className="py-16 lg:py-20">
      <div className="container-page">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {destinations.map((d) => {
              const code = destinationSlugToCode[d.slug];
              const isActive = active === d.slug;
              return (
                <button
                  key={d.slug}
                  onClick={() => setActive(d.slug)}
                  className={cn(
                    "group flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all",
                    isActive
                      ? "border-[color:var(--navy-900)] bg-[color:var(--navy-900)] text-white"
                      : "border-[color:var(--ink-200)] bg-white text-[color:var(--navy-900)] hover:border-[color:var(--navy-500)]"
                  )}
                >
                  {code && <CountryFlag code={code} className="h-12 w-16" />}
                  <div>
                    <div className="font-[family-name:var(--font-montserrat)] font-extrabold uppercase tracking-wider text-sm">
                      {d.name}
                    </div>
                    <div className={cn("text-[11px]", isActive ? "text-white/70" : "text-[color:var(--ink-500)]")}>
                      {d.cities.length} orașe
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeDest.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="mt-10"
          >
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {activeDest.cities.map((c) => (
                <Link
                  key={c.id}
                  href={`/rezervare?to=${encodeURIComponent(c.name)}`}
                  className="group flex items-center gap-2 rounded-xl border border-[color:var(--ink-200)] bg-white px-3 py-2.5 text-sm text-[color:var(--ink-700)] hover:border-[color:var(--red-400)] hover:text-[color:var(--navy-900)] transition-all"
                >
                  <MapPin className="h-3.5 w-3.5 text-[color:var(--red-500)] shrink-0" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
