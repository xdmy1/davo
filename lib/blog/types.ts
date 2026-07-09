// Blog content model. Posts are authored as an array of typed blocks so the
// renderer stays declarative and every article shares the same styling. Slugs
// are locale-agnostic (like the rest of the site); UI chrome is translated via
// the `blogChrome` map, article bodies are authored per language when available.

import type { Locale } from "@/lib/i18n/config";

// Inline text supports a tiny markdown subset: **bold** and [label](url).
// Rendered by renderInline() in the ArticleBody component.
export type InlineText = string;

export type Block =
  | { type: "p"; text: InlineText }
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: InlineText[] }
  | { type: "ol"; items: InlineText[] }
  | { type: "quote"; text: InlineText; cite?: string }
  | {
      type: "callout";
      variant: "info" | "warning" | "danger" | "success";
      title?: string;
      text: InlineText;
    }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "stats"; items: { value: string; label: string }[] };

export type FaqItem = { q: string; a: string };

export type BlogPost = {
  slug: string;
  /** Short category label shown as an eyebrow chip, e.g. "Reglementări". */
  category: string;
  title: string;
  /** One-line summary for cards and meta description fallback. */
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** ISO date of last substantive update, if any. */
  updated?: string;
  readingMinutes: number;
  author: string;
  /** 3–5 bullet takeaways surfaced at the top of the article. */
  keyTakeaways: string[];
  /** Section headings collected for the table of contents. */
  content: Block[];
  faq: FaqItem[];
  source?: { name: string; url: string };
  /** Locales this post is authored in; used for hreflang alternates. */
  locales: Locale[];
};

// UI chrome (buttons, labels) translated per locale. Article bodies live in the
// post objects; only the surrounding shell is localized here.
export const blogChrome: Record<
  Locale,
  {
    eyebrow: string;
    indexTitle: string;
    indexIntro: string;
    metaTitle: string;
    metaDescription: string;
    readMore: string;
    minRead: (n: number) => string;
    published: string;
    updated: string;
    backToBlog: string;
    onThisPage: string;
    keyTakeaways: string;
    source: string;
    faqTitle: string;
    ctaEyebrow: string;
    ctaTitle: string;
    ctaText: string;
    ctaButton: string;
    relatedTitle: string;
    empty: string;
    homeCrumb: string;
  }
> = {
  ro: {
    eyebrow: "Blog DAVO",
    indexTitle: "Noutăți, ghiduri și reglementări pentru transport",
    indexIntro:
      "Articole utile despre transportul internațional, reglementările din UE și tot ce trebuie să știi înainte de a călători sau de a trimite colete cu DAVO Group.",
    metaTitle: "Blog DAVO Group — transport, reglementări și ghiduri",
    metaDescription:
      "Ghiduri și noutăți despre transportul de pasageri și colete Moldova → Europa: reglementări UE, tahografe, drepturi la bord și sfaturi de călătorie.",
    readMore: "Citește articolul",
    minRead: (n) => `${n} min de citit`,
    published: "Publicat",
    updated: "Actualizat",
    backToBlog: "Înapoi la blog",
    onThisPage: "În acest articol",
    keyTakeaways: "Pe scurt",
    source: "Sursă",
    faqTitle: "Întrebări frecvente",
    ctaEyebrow: "Călătorește cu DAVO",
    ctaTitle: "Transport sigur Moldova → Europa",
    ctaText:
      "Rezervă un loc sau trimite un colet cu DAVO Group. Autocare moderne, Starlink la bord și însoțitoare 24/7.",
    ctaButton: "Rezervă acum",
    relatedTitle: "Alte articole",
    empty: "Momentan nu există articole. Revino în curând.",
    homeCrumb: "Acasă",
  },
  ru: {
    eyebrow: "Блог DAVO",
    indexTitle: "Новости, гиды и правила для перевозок",
    indexIntro:
      "Полезные статьи о международных перевозках, правилах ЕС и обо всём, что нужно знать перед поездкой или отправкой посылок с DAVO Group.",
    metaTitle: "Блог DAVO Group — перевозки, правила и гиды",
    metaDescription:
      "Гиды и новости о перевозке пассажиров и посылок Молдова → Европа: правила ЕС, тахографы, права на борту и советы для поездки.",
    readMore: "Читать статью",
    minRead: (n) => `${n} мин чтения`,
    published: "Опубликовано",
    updated: "Обновлено",
    backToBlog: "Назад в блог",
    onThisPage: "В этой статье",
    keyTakeaways: "Коротко",
    source: "Источник",
    faqTitle: "Частые вопросы",
    ctaEyebrow: "Путешествуйте с DAVO",
    ctaTitle: "Безопасные перевозки Молдова → Европа",
    ctaText:
      "Забронируйте место или отправьте посылку с DAVO Group. Современные автобусы, Starlink на борту и сопровождение 24/7.",
    ctaButton: "Забронировать",
    relatedTitle: "Другие статьи",
    empty: "Пока нет статей. Загляните позже.",
    homeCrumb: "Главная",
  },
};
