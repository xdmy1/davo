"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, ArrowRight, MessageCircle, Clock } from "lucide-react";
import { contactInfo, destinations, services } from "@/lib/data";
import { countryLandingUrl } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  TelegramIcon,
  WhatsAppIcon,
} from "@/components/ui/SocialIcons";

const socials = [
  { href: `https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, "")}`, icon: WhatsAppIcon, label: "WhatsApp" },
  { href: `https://t.me/${contactInfo.telegram.replace(/[^0-9]/g, "")}`, icon: TelegramIcon, label: "Telegram" },
  { href: "https://facebook.com", icon: FacebookIcon, label: "Facebook" },
  { href: "https://instagram.com", icon: InstagramIcon, label: "Instagram" },
  { href: "https://youtube.com", icon: YoutubeIcon, label: "YouTube" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-[color:var(--navy-950)] text-white overflow-hidden">
      {/* CTA band — rich end-of-page call to action */}
      <div className="relative bg-gradient-to-br from-[color:var(--ink-50)] via-white to-[color:var(--navy-50)] border-b border-[color:var(--ink-100)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(225,30,43,0.08),transparent_65%)] blur-2xl"
        />
        <div className="container-page relative">
          <Reveal>
            <div className="grid gap-8 py-12 md:py-16 lg:grid-cols-[1.1fr,1fr] lg:gap-12 items-center">
              {/* Left — pitch */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--navy-800)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--red-500)]" />
                  Gata de drum
                </span>
                <h2 className="mt-4 display-hero text-[color:var(--navy-900)] text-[clamp(1.5rem,3vw,2.25rem)] leading-tight">
                  Planifică-ți călătoria <br className="hidden md:inline" />
                  cu <span className="text-[color:var(--red-500)]">DAVO Group</span>
                </h2>
                <p className="mt-4 text-[color:var(--ink-700)] max-w-lg">
                  Germania, Olanda, Anglia, Belgia, Luxemburg — plecări regulate, autocare
                  confortabile, șoferi experimentați. Rezervă online sau sună-ne, răspundem 24/7.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/rezervare"
                    className="group inline-flex items-center gap-2 rounded-lg bg-[color:var(--red-500)] px-6 py-3.5 font-bold uppercase tracking-wider text-white text-sm hover:bg-[color:var(--red-600)] transition-colors shadow-[0_14px_30px_-10px_rgba(225,30,43,0.5)]"
                  >
                    Rezervă acum
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--ink-200)] bg-white px-6 py-3.5 font-bold uppercase tracking-wider text-[color:var(--navy-900)] text-sm hover:border-[color:var(--navy-700)] transition-colors"
                  >
                    Scrie-ne
                  </Link>
                </div>
              </div>

              {/* Right — contact channels */}
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                  className="group flex items-start gap-3 rounded-2xl border border-[color:var(--ink-200)] bg-white p-4 hover:border-[color:var(--red-400)] hover:shadow-[0_18px_38px_-20px_rgba(11,38,83,0.3)] transition-all"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--red-500)] group-hover:bg-[color:var(--red-50)]">
                    <Phone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-[color:var(--ink-500)]">
                      Telefon
                    </span>
                    <span className="block mt-0.5 text-sm font-bold text-[color:var(--navy-900)] truncate">
                      {contactInfo.phone}
                    </span>
                  </span>
                </a>

                <a
                  href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 rounded-2xl border border-[color:var(--ink-200)] bg-white p-4 hover:border-[color:var(--red-400)] hover:shadow-[0_18px_38px_-20px_rgba(11,38,83,0.3)] transition-all"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--red-500)] group-hover:bg-[color:var(--red-50)]">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-[color:var(--ink-500)]">
                      WhatsApp
                    </span>
                    <span className="block mt-0.5 text-sm font-bold text-[color:var(--navy-900)] truncate">
                      {contactInfo.whatsapp}
                    </span>
                  </span>
                </a>

                <a
                  href={`mailto:${contactInfo.email}`}
                  className="group flex items-start gap-3 rounded-2xl border border-[color:var(--ink-200)] bg-white p-4 hover:border-[color:var(--red-400)] hover:shadow-[0_18px_38px_-20px_rgba(11,38,83,0.3)] transition-all"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--navy-50)] text-[color:var(--red-500)] group-hover:bg-[color:var(--red-50)]">
                    <Mail className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-[color:var(--ink-500)]">
                      Email
                    </span>
                    <span className="block mt-0.5 text-sm font-bold text-[color:var(--navy-900)] truncate">
                      {contactInfo.email}
                    </span>
                  </span>
                </a>

                <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--ink-200)] bg-[color:var(--navy-900)] p-4 text-white">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[color:var(--red-400)]">
                    <Clock className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-white/60">
                      Dispecerat
                    </span>
                    <span className="block mt-0.5 text-sm font-bold truncate">
                      24/7 · non-stop
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Main footer content */}
      <div className="relative pt-12 pb-10">
        <div className="container-page">
          <div className="grid gap-10 md:grid-cols-12">
            {/* Brand + description */}
            <Reveal className="md:col-span-4">
              <Link href="/" className="inline-flex mb-5" aria-label="DAVO Group home">
                <Image
                  src="/images/logo-davo.png"
                  alt="DAVO Group"
                  width={120}
                  height={44}
                  unoptimized
                  className="h-11 w-auto brightness-0 invert"
                />
              </Link>
              <p className="text-sm text-white/70 leading-relaxed max-w-sm mb-6">
                Servicii de transport de pasageri și colete la cele mai avantajoase prețuri. Zilnic, sigur, confortabil.
              </p>
              <div className="space-y-2.5 text-sm">
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 text-[color:var(--red-400)]" />
                  {contactInfo.email}
                </a>
                <a
                  href={contactInfo.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <MapPin className="h-4 w-4 text-[color:var(--red-400)] mt-0.5 shrink-0" />
                  <span>
                    {contactInfo.address}
                    <span className="block text-[11px] text-white/45 mt-0.5">
                      Deschide în Google Maps →
                    </span>
                  </span>
                </a>
              </div>
            </Reveal>

            {/* Links columns */}
            <Reveal delay={0.05} className="md:col-span-2">
              <FooterColumn title="Rezervă bilet">
                {destinations.slice(0, 5).map((d) => (
                  <FooterLink key={d.id} href={countryLandingUrl(d)}>
                    Transport Moldova - {d.name}
                  </FooterLink>
                ))}
              </FooterColumn>
            </Reveal>

            <Reveal delay={0.1} className="md:col-span-3">
              <FooterColumn title="Serviciile oferite">
                {services.slice(0, 4).map((s) => (
                  <FooterLink key={s.id} href={`/servicii/${s.slug}`}>
                    {s.title}
                  </FooterLink>
                ))}
              </FooterColumn>
            </Reveal>

            <Reveal delay={0.15} className="md:col-span-3">
              <FooterColumn title="Informații utile">
                <FooterLink href="/informatii-utile">Social DAVO Group</FooterLink>
                <FooterLink href="/rezervare">Rezervări</FooterLink>
                <FooterLink href="/despre-noi">Despre noi</FooterLink>
                <FooterLink href="/contact">Contacte</FooterLink>
                <FooterLink href="/rechizite-bancare">Rechizite bancare</FooterLink>
                <FooterLink href="/termeni-pasageri">T&amp;C pasageri</FooterLink>
                <FooterLink href="/termeni-colete">T&amp;C colete</FooterLink>
              </FooterColumn>
            </Reveal>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 pt-8 border-t border-white/10 grid gap-6 md:grid-cols-3 items-center">
            <div className="text-[12px] text-white/50 justify-self-center md:justify-self-start">
              © {year} DAVO GROUP SRL · developed by{" "}
              <a
                href="https://landings.md"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white/80 hover:text-[color:var(--red-400)] transition-colors"
              >
                landings.md
              </a>
            </div>
            <div className="flex items-center gap-3 justify-self-center">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-[color:var(--red-400)] hover:text-[color:var(--red-400)] hover:bg-white/10"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3 justify-self-center md:justify-self-end text-xs text-white/60">
              <a
                href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                className="font-semibold text-white hover:text-[color:var(--red-400)]"
              >
                {contactInfo.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-[family-name:var(--font-montserrat)] font-bold uppercase tracking-wider text-[12px] text-white mb-4">
        {title}
      </h4>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-white/65 hover:text-[color:var(--red-400)] transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function BusSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="8" y="18" width="160" height="50" rx="10" fill="currentColor" opacity="0.18" />
      <rect x="12" y="22" width="150" height="34" rx="6" fill="currentColor" opacity="0.08" />
      <rect x="18" y="26" width="22" height="22" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="44" y="26" width="22" height="22" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="70" y="26" width="22" height="22" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="96" y="26" width="22" height="22" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="122" y="26" width="34" height="22" rx="3" fill="currentColor" opacity="0.35" />
      <circle cx="38" cy="70" r="10" fill="currentColor" opacity="0.9" />
      <circle cx="38" cy="70" r="4" fill="#0b2653" />
      <circle cx="138" cy="70" r="10" fill="currentColor" opacity="0.9" />
      <circle cx="138" cy="70" r="4" fill="#0b2653" />
      <rect x="158" y="34" width="6" height="10" rx="1" fill="#e11e2b" />
    </svg>
  );
}
