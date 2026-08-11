"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import {
  FacebookIcon,
  TelegramIcon,
  ViberIcon,
  WhatsAppIcon,
} from "@/components/ui/SocialIcons";

// Rând de butoane pentru distribuirea biletului pe rețele sociale (WhatsApp,
// Viber, Telegram, Facebook) + copiere link. Folosit pe ecranul de succes de
// după rezervare și pe pagina biletului. `path` e calea relativă a biletului —
// URL-ul absolut se construiește pe client din origin, ca să meargă pe orice
// domeniu (acceptă și un URL deja absolut).
export function ShareTicket({
  path,
  text,
  label = "Distribuie biletul:",
  className = "",
}: {
  path: string;
  text: string;
  label?: string;
  className?: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;

  const url = path.startsWith("http") ? path : `${origin}${path}`;
  const enc = encodeURIComponent;
  const links = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
      icon: WhatsAppIcon,
      bg: "#25D366",
      external: true,
    },
    {
      label: "Viber",
      href: `viber://forward?text=${enc(`${text} ${url}`)}`,
      icon: ViberIcon,
      bg: "#7360F2",
      external: false,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      icon: TelegramIcon,
      bg: "#229ED9",
      external: true,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      icon: FacebookIcon,
      bg: "#1877F2",
      external: true,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(url);
    }
  };

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2.5 ${className}`}>
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)]">
        {label}
      </span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={l.label}
          title={l.label}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: l.bg }}
        >
          <l.icon className="h-5 w-5" />
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label="Copiază link"
        title="Copiază link"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ink-200)] bg-white text-[color:var(--navy-900)] transition-transform hover:scale-110"
      >
        {copied ? (
          <Check className="h-5 w-5 text-[color:var(--success)]" />
        ) : (
          <Link2 className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
