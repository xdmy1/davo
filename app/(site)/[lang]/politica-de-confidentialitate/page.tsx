import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/sections/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { isLocale, localePath } from "@/lib/i18n/config";
import { dict } from "@/lib/i18n/dict";

const lastUpdated = "30.10.2026";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = dict(lang);
  return {
    title: t.privacyPage.metaTitle,
    description: t.privacyPage.metaDescription,
    alternates: {
      canonical: localePath(lang, "/politica-de-confidentialitate"),
      languages: {
        ro: localePath("ro", "/politica-de-confidentialitate"),
        ru: localePath("ru", "/politica-de-confidentialitate"),
      },
    },
  };
}

export default async function PoliticaConfidentialitatePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = dict(lang);
  const pp = t.privacyPage;

  return (
    <>
      <PageHero
        eyebrow={pp.eyebrow}
        title={pp.title}
        description={pp.description}
        tone="dark"
      />

      <section className="py-12 lg:py-16">
        <div className="container-page max-w-4xl">
          <Reveal>
            <p className="text-sm text-[color:var(--ink-500)]">
              {pp.lastUpdated}{" "}
              <span className="font-semibold text-[color:var(--ink-700)]">{lastUpdated}</span>
            </p>
          </Reveal>

          <div className="mt-10 space-y-10">
            {pp.sections.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.03}>
                <article>
                  <h2 className="font-[family-name:var(--font-montserrat)] text-xl md:text-2xl font-extrabold text-[color:var(--navy-900)]">
                    {s.title}
                  </h2>
                  <div className="mt-4 space-y-3 text-[color:var(--ink-700)] leading-relaxed">
                    {s.body.map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
