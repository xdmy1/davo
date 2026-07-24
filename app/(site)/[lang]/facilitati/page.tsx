import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FacilitatiClient from "./FacilitatiClient";
import { isLocale, localePath } from "@/lib/i18n/config";
import { dict } from "@/lib/i18n/dict";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = dict(lang).facilitatiPage;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://davo.md").replace(/\/$/, "");
  const canonicalPath = localePath(lang, "/facilitati");
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical: canonicalPath,
      languages: {
        ro: localePath("ro", "/facilitati"),
        ru: localePath("ru", "/facilitati"),
      },
    },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      type: "website",
      url: `${baseUrl}${canonicalPath}`,
      locale: lang === "ru" ? "ru_RU" : "ro_MD",
    },
  };
}

export default async function FacilitatiPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <FacilitatiClient />;
}
