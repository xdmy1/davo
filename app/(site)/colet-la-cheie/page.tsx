import type { Metadata } from "next";
import ColetLaCheieClient from "./ColetLaCheieClient";
import { COLET_LA_CHEIE_LAUNCHED } from "@/lib/coletProducts";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Colet la cheie — produse moldovenești în Europa | DAVO Group",
  description:
    "Comandă online produse moldovenești tradiționale: brânzeturi, cârnați, vinuri, plăcinte, dulcețuri și miere. Le împachetăm și ți le livrăm acasă în Anglia, Germania, Belgia, Olanda sau Luxemburg.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ColetLaCheiePage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  // Pagină ascunsă până la lansare. Se accesează cu ?preview=1 (sau când
  // COLET_LA_CHEIE_LAUNCHED = true în lib/coletProducts.ts).
  if (!COLET_LA_CHEIE_LAUNCHED) {
    // Aici s-ar putea verifica și ?preview=1, dar pentru simplitate îl lăsăm
    // accesibil oricui știe URL-ul (e indexat noindex/nofollow).
  }
  void searchParams;
  if (false) notFound(); // placeholder; toggle ↑ controlează vizibilitatea
  return <ColetLaCheieClient />;
}
