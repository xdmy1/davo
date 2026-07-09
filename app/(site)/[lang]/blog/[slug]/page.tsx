import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CalendarDays,
  User,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import FAQ from "@/components/sections/FAQ";
import ArticleBody from "@/components/blog/ArticleBody";
import { Reveal } from "@/components/ui/Reveal";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog/posts";
import { blogChrome } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/format";
import { contactInfo } from "@/lib/data";
import { isLocale, locales, localePath, type Locale } from "@/lib/i18n/config";

export const revalidate = 3600;

export function generateStaticParams() {
  const params: { lang: string; slug: string }[] = [];
  for (const lang of locales) {
    for (const post of getAllPosts()) {
      params.push({ lang, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const post = getPostBySlug(slug);
  if (!post) return {};

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  const canonicalPath = localePath(lang, `/blog/${post.slug}`);

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: {
      canonical: canonicalPath,
      languages: {
        ro: localePath("ro", `/blog/${post.slug}`),
        ru: localePath("ru", `/blog/${post.slug}`),
      },
    },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      url: `${baseUrl}${canonicalPath}`,
      locale: lang === "ru" ? "ru_RU" : "ro_MD",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author],
      tags: [post.category],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const c = blogChrome[locale];
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  const postUrl = `${baseUrl}${localePath(locale, `/blog/${post.slug}`)}`;
  const toc = post.content.filter((b): b is Extract<typeof b, { type: "h2" }> => b.type === "h2");
  const related = getRelatedPosts(post.slug);

  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${postUrl}#article`,
    headline: post.title,
    description: post.metaDescription,
    inLanguage: locale === "ru" ? "ru-RU" : "ro-MD",
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: post.author, url: baseUrl },
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "DAVO Group",
      logo: { "@type": "ImageObject", url: `${baseUrl}/images/logo-davo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    articleSection: post.category,
    ...(post.source ? { isBasedOn: post.source.url } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: c.homeCrumb, item: `${baseUrl}${localePath(locale, "/")}` },
      { "@type": "ListItem", position: 2, name: c.eyebrow, item: `${baseUrl}${localePath(locale, "/blog")}` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  };

  const faqPageLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="container-page relative py-14 lg:py-20">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-white/60">
            <Link href={localePath(locale, "/")} className="hover:text-white transition-colors">
              {c.homeCrumb}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={localePath(locale, "/blog")} className="hover:text-white transition-colors">
              {c.eyebrow}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80 line-clamp-1">{post.category}</span>
          </nav>

          <Reveal>
            <span className="inline-flex items-center rounded-full bg-[color:var(--red-500)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              {post.category}
            </span>
            <h1 className="display-hero display-lg text-white mt-5 max-w-4xl">{post.title}</h1>
            <p className="mt-5 text-lg text-white/70 max-w-2xl leading-relaxed">{post.excerpt}</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-[color:var(--red-400)]" />
                {post.author}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[color:var(--red-400)]" />
                {c.published} {formatBlogDate(post.date, locale)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-[color:var(--red-400)]" />
                {c.minRead(post.readingMinutes)}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Body */}
      <section className="py-14 lg:py-20">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[1fr_280px] lg:gap-16">
            <article className="min-w-0 max-w-3xl">
              {/* Key takeaways */}
              {post.keyTakeaways.length > 0 && (
                <div className="mb-10 rounded-3xl border border-[color:var(--ink-200)] bg-[color:var(--ink-50)] p-6 md:p-7">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--red-500)]">
                    <span className="h-1.5 w-6 rounded-full bg-[color:var(--red-500)]" />
                    {c.keyTakeaways}
                  </div>
                  <ul className="mt-4 space-y-3">
                    {post.keyTakeaways.map((t, i) => (
                      <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-[color:var(--ink-700)]">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--success)]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ArticleBody blocks={post.content} />

              {/* Source */}
              {post.source && (
                <p className="mt-10 border-t border-[color:var(--ink-200)] pt-6 text-sm text-[color:var(--ink-500)]">
                  {c.source}:{" "}
                  <a
                    href={post.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[color:var(--navy-700)] hover:text-[color:var(--red-500)]"
                  >
                    {post.source.name}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              )}

              {/* Back link */}
              <div className="mt-8">
                <Link
                  href={localePath(locale, "/blog")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--navy-900)] hover:text-[color:var(--red-500)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {c.backToBlog}
                </Link>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                {toc.length > 0 && (
                  <nav className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--navy-800)]">
                      {c.onThisPage}
                    </div>
                    <ul className="mt-3 space-y-2.5 border-l border-[color:var(--ink-200)]">
                      {toc.map((h) => (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            className="-ml-px block border-l-2 border-transparent pl-4 text-sm leading-snug text-[color:var(--ink-500)] transition-colors hover:border-[color:var(--red-500)] hover:text-[color:var(--navy-900)]"
                          >
                            {h.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}

                {/* CTA */}
                <div className="relative overflow-hidden rounded-2xl bg-[color:var(--navy-900)] p-6 text-white">
                  <div className="bg-noise absolute inset-0 opacity-30" />
                  <div className="relative">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--red-400)]">
                      {c.ctaEyebrow}
                    </div>
                    <div className="mt-2 font-[family-name:var(--font-montserrat)] text-lg font-bold leading-tight">
                      {c.ctaTitle}
                    </div>
                    <p className="mt-2 text-sm text-white/65 leading-relaxed">{c.ctaText}</p>
                    <Link
                      href={localePath(locale, "/rezervare")}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--red-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors"
                    >
                      {c.ctaButton}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Mobile CTA band */}
      <section className="lg:hidden">
        <div className="container-page pb-4">
          <div className="relative overflow-hidden rounded-2xl bg-[color:var(--navy-900)] p-6 text-white">
            <div className="bg-noise absolute inset-0 opacity-30" />
            <div className="relative">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--red-400)]">
                {c.ctaEyebrow}
              </div>
              <div className="mt-2 font-[family-name:var(--font-montserrat)] text-xl font-bold leading-tight">
                {c.ctaTitle}
              </div>
              <p className="mt-2 text-sm text-white/65">{c.ctaText}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={localePath(locale, "/rezervare")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[color:var(--red-500)] px-5 py-3 text-sm font-semibold text-white"
                >
                  {c.ctaButton}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
                >
                  {contactInfo.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="py-14 bg-[color:var(--ink-50)]">
          <div className="container-page">
            <Reveal>
              <h2 className="display-hero display-md text-[color:var(--navy-900)]">{c.relatedTitle}</h2>
            </Reveal>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.slug} delay={Math.min(i * 0.05, 0.3)}>
                  <Link
                    href={localePath(locale, `/blog/${r.slug}`)}
                    className="group flex h-full flex-col rounded-2xl border border-[color:var(--ink-200)] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[color:var(--red-400)]"
                  >
                    <span className="inline-flex w-fit items-center rounded-full bg-[color:var(--navy-50)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--navy-800)]">
                      {r.category}
                    </span>
                    <h3 className="mt-4 font-[family-name:var(--font-montserrat)] text-lg font-bold leading-snug text-[color:var(--navy-900)]">
                      {r.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--ink-500)]">{r.excerpt}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--red-500)]">
                      {c.readMore}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <FAQ items={post.faq} title={c.faqTitle} />
    </>
  );
}
