import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
} from "@/lib/jsonLd";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Global JSON-LD — Organization + LocalBusiness + WebSite.
          Aplicate doar pe paginile publice (nu pe /admin sau /login). */}
      <JsonLd
        data={[organizationSchema(), localBusinessSchema(), websiteSchema()]}
      />
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
    </>
  );
}
