"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Phone } from "lucide-react";
import { navItems, contactInfo } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/ui/SocialIcons";

const socials = [
  { href: `https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, "")}`, icon: WhatsAppIcon, label: "WhatsApp" },
  { href: contactInfo.social.facebook, icon: FacebookIcon, label: "Facebook" },
  { href: contactInfo.social.instagram, icon: InstagramIcon, label: "Instagram" },
  { href: contactInfo.social.tiktok, icon: TikTokIcon, label: "TikTok" },
];

const languages = [
  { code: "ro", label: "RO" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("ro");
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const activeLang = languages.find((l) => l.code === lang) ?? languages[0];

  return (
    <>
      {/* Top contact strip */}
      <div className="hidden lg:block print:!hidden bg-[color:var(--navy-950)] text-white">
        <div className="container-page flex items-center justify-between py-2 text-[13px]">
          <a
            href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-[color:var(--red-400)]" />
            <span className="font-medium tracking-wide">Contact: {contactInfo.phone}</span>
          </a>

          <div className="flex items-center gap-5">
            {/* language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                onBlur={() => setTimeout(() => setLangOpen(false), 140)}
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                {activeLang.label}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", langOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute right-0 top-full mt-2 min-w-[80px] rounded-lg bg-white py-1 text-slate-900 shadow-lg"
                  >
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={cn(
                          "block w-full px-3 py-1.5 text-left text-sm hover:bg-[color:var(--navy-50)]",
                          l.code === lang && "text-[color:var(--red-500)] font-semibold"
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* socials */}
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="text-white/70 hover:text-[color:var(--red-400)] transition-colors"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "print:hidden sticky top-0 z-50 border-b border-transparent transition-all duration-300",
          scrolled
            ? "bg-white/90 backdrop-blur-md border-[color:var(--ink-100)] shadow-sm"
            : "bg-white"
        )}
      >
        <div className="container-page flex items-center justify-between py-3 lg:py-4">
          <Logo />

          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setHoveredDropdown(item.label)}
                onMouseLeave={() => setHoveredDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-[14px] font-semibold transition-colors rounded-md",
                    pathname === item.href
                      ? "text-[color:var(--red-500)]"
                      : "text-[color:var(--navy-900)] hover:text-[color:var(--red-500)]"
                  )}
                >
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        hoveredDropdown === item.label && "rotate-180"
                      )}
                    />
                  )}
                </Link>

                <AnimatePresence>
                  {item.children && hoveredDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-0 pt-2"
                    >
                      <div className="bg-white rounded-xl shadow-lg border border-[color:var(--ink-100)] min-w-[260px] overflow-hidden">
                        {item.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            className="block px-4 py-2.5 text-sm text-[color:var(--ink-700)] hover:bg-[color:var(--navy-50)] hover:text-[color:var(--red-500)] transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          <div className="hidden xl:flex items-center gap-3">
            <Link
              href="/rezervare"
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--red-500)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(225,30,43,0.55)] hover:bg-[color:var(--red-600)] transition-colors"
            >
              Rezervă acum
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Meniu"
            className="xl:hidden p-2 -mr-2 text-[color:var(--navy-900)] hover:bg-[color:var(--navy-50)] rounded-md transition-colors"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="xl:hidden border-t border-[color:var(--ink-100)] overflow-hidden"
            >
              <div className="container-page py-4">
                <MobileNav onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}

function Logo() {
  return (
    <Link href="/" className="shrink-0" aria-label="DAVO Group home">
      <Image
        src="/images/logo-davo.png"
        alt="DAVO Group"
        width={120}
        height={44}
        priority
        unoptimized
        className="h-8 w-auto"
      />
    </Link>
  );
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <nav className="flex flex-col">
      {navItems.map((item) => (
        <div key={item.label} className="border-b border-[color:var(--ink-100)] last:border-b-0">
          {item.children ? (
            <>
              <button
                onClick={() => setOpen(open === item.label ? null : item.label)}
                className="flex w-full items-center justify-between py-3 text-left font-semibold text-[color:var(--navy-900)]"
              >
                {item.label}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    open === item.label && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === item.label && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-4"
                  >
                    <div className="pb-3 space-y-1">
                      {item.children.map((c) => (
                        <Link
                          key={c.label}
                          href={c.href}
                          onClick={onNavigate}
                          className="block py-2 text-sm text-[color:var(--ink-700)] hover:text-[color:var(--red-500)]"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Link
              href={item.href}
              onClick={onNavigate}
              className="block py-3 font-semibold text-[color:var(--navy-900)]"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
      <div className="mt-4 flex flex-col gap-2">
        <a
          href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-[color:var(--navy-900)] px-4 py-3 text-white font-semibold"
        >
          <Phone className="h-4 w-4" /> {contactInfo.phone}
        </a>
        <Link
          href="/rezervare"
          onClick={onNavigate}
          className="flex items-center justify-center rounded-lg bg-[color:var(--red-500)] px-4 py-3 text-white font-semibold"
        >
          Rezervă acum
        </Link>
      </div>
    </nav>
  );
}
