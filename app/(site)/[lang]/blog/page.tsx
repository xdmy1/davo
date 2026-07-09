import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, CalendarDays } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { getLocalizedPosts } from "@/lib/blog/posts";
import { blogChrome } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/format";
import { isLocale, localePath, type Locale } from "@/lib/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const c = blogChrome[lang];
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: localePath(lang, "/blog"),
      languages: {
        ro: localePath("ro", "/blog"),
        ru: localePath("ru", "/blog"),
      },
    },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      type: "website",
      locale: lang === "ru" ? "ru_RU" : "ro_MD",
    },
  };
}

export default async function BlogIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const c = blogChrome[locale];
  const posts = getLocalizedPosts(locale);
  const [featured, ...rest] = posts;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="container-page relative py-16 lg:py-24">
          <Reveal>
            <span className="eyebrow text-[color:var(--red-400)]">
              <span className="h-1.5 w-6 rounded-full bg-[color:var(--red-500)]" />
              {c.eyebrow}
            </span>
            <h1 className="display-hero display-xl text-white mt-5 max-w-4xl">
              {c.indexTitle}
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-2xl leading-relaxed">
              {c.indexIntro}
            </p>
          </Reveal>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="py-24">
          <div className="container-page">
            <p className="text-center text-[color:var(--ink-500)]">{c.empty}</p>
          </div>
        </section>
      ) : (
        <section className="py-16 lg:py-20">
          <div className="container-page">
            {/* Featured post */}
            <Reveal>
              <Link
                href={localePath(locale, `/blog/${featured.slug}`)}
                className="group grid overflow-hidden rounded-3xl border border-[color:var(--ink-200)] bg-white transition-all hover:-translate-y-1 hover:border-[color:var(--red-400)] hover:shadow-[0_28px_60px_-30px_rgba(11,38,83,0.4)] lg:grid-cols-2"
              >
                <div className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-hero-navy p-8 text-white lg:p-10">
                  <div className="bg-noise absolute inset-0 opacity-30" />
                  <div className="relative">
                    <span className="inline-flex items-center rounded-full bg-[color:var(--red-500)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      {featured.category}
                    </span>
                  </div>
                  <div className="relative mt-8 font-[family-name:var(--font-montserrat)] text-2xl font-extrabold leading-tight md:text-3xl">
                    {featured.title}
                  </div>
                </div>
                <div className="flex flex-col justify-center p-8 lg:p-10">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[color:var(--ink-500)]">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatBlogDate(featured.date, locale)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {c.minRead(featured.readingMinutes)}
                    </span>
                  </div>
                  <p className="mt-4 text-[color:var(--ink-700)] leading-relaxed">
                    {featured.excerpt}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-[color:var(--red-500)]">
                    {c.readMore}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>

            {/* Rest of the posts */}
            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, i) => (
                  <Reveal key={post.slug} delay={Math.min(i * 0.05, 0.3)}>
                    <Link
                      href={localePath(locale, `/blog/${post.slug}`)}
                      className="group flex h-full flex-col rounded-2xl border border-[color:var(--ink-200)] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[color:var(--red-400)] hover:shadow-[0_20px_44px_-24px_rgba(11,38,83,0.35)]"
                    >
                      <span className="inline-flex w-fit items-center rounded-full bg-[color:var(--navy-50)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--navy-800)]">
                        {post.category}
                      </span>
                      <h2 className="mt-4 font-[family-name:var(--font-montserrat)] text-lg font-bold leading-snug text-[color:var(--navy-900)]">
                        {post.title}
                      </h2>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--ink-500)]">
                        {post.excerpt}
                      </p>
                      <div className="mt-5 flex items-center justify-between border-t border-[color:var(--ink-100)] pt-4 text-xs text-[color:var(--ink-500)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {c.minRead(post.readingMinutes)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-[color:var(--ink-400)] transition-transform group-hover:translate-x-1 group-hover:text-[color:var(--red-500)]" />
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
