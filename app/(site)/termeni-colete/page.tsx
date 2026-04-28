import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Termeni și condiții — Transport colete | DAVO Group",
  description:
    "Termenii și condițiile de transport al coletelor cu DAVO Group din Moldova spre Europa.",
};

const lastUpdated = "2026-04-26";

const sections = [
  {
    title: "1. Definiții",
    body: [
      "'Transportator' — DAVO GROUP S.R.L., entitatea care prestează serviciul de transport colete.",
      "'Expeditor' — persoana fizică sau juridică ce predă coletul Transportatorului spre expediere.",
      "'Destinatar' — persoana indicată de Expeditor ca beneficiar al coletului la destinație.",
      "'Colet' — pachet, plic, bagaj sau marfă predată Transportatorului spre expediere.",
    ],
  },
  {
    title: "2. Obiectul contractului",
    body: [
      "Transportatorul se obligă să preia coletul de la Expeditor și să-l livreze Destinatarului indicat, în condițiile și termenii specificați.",
      "Prin predarea coletului, Expeditorul confirmă că a luat cunoștință și acceptă prezenții termeni și condiții.",
    ],
  },
  {
    title: "3. Articole permise și interzise",
    body: [
      "Se acceptă la transport: bunuri personale, haine, încălțăminte, cosmetice, produse alimentare neperisabile, documente, cadouri, electronice împachetate corespunzător.",
      "Se acceptă pe bază de comandă specială (frigorifică): produse alimentare perisabile (carne, lactate, brânzeturi, legume, fructe). Pentru aceste produse Transportatorul asigură remorcă frigorifică la temperatură controlată.",
      "Sunt STRICT INTERZISE la transport: arme, muniție, substanțe explozive sau inflamabile, droguri, animale vii (fără acord prealabil scris), valută în numerar sau valori mobiliare, bijuterii sau metale prețioase nedeclarate, materiale toxice sau radioactive, articole interzise de legislația țărilor tranzitate.",
      "Expeditorul răspunde personal pentru conținutul declarat. În caz de declarare falsă, Transportatorul își rezervă dreptul de a refuza expedierea sau de a anunța autoritățile.",
    ],
  },
  {
    title: "4. Ambalarea și etichetarea",
    body: [
      "Expeditorul este responsabil pentru ambalarea corespunzătoare a coletului, astfel încât să reziste la transport (cutie de carton rezistentă, folie cu bule, ambalaj termic pentru perisabile).",
      "Coletul trebuie etichetat clar cu: numele și telefonul Expeditorului și Destinatarului, adresa de livrare, descrierea succintă a conținutului.",
      "Transportatorul NU răspunde de daunele cauzate de ambalare necorespunzătoare.",
    ],
  },
  {
    title: "5. Greutate și dimensiuni",
    body: [
      "Coletele se acceptă până la 200 kg / colet. Pentru greutăți mai mari, contactați Transportatorul în prealabil.",
      "Tariful de transport se calculează în funcție de greutate, dimensiuni și destinație. Tariful final se confirmă la preluarea coletului și se afișează pe site la rezervare.",
    ],
  },
  {
    title: "6. Preluarea, transportul și livrarea",
    body: [
      "Preluarea coletului se face de la adresa Expeditorului din toată Moldova (Bălți, Cahul, Comrat, Ungheni, Orhei, Soroca, Tiraspol și alte orașe), conform graficului de colectare comunicat.",
      "Transportul se efectuează cu autocare/dube specializate, securizate și echipate corespunzător (inclusiv frigorifice pentru perisabile).",
      "Livrarea la destinație se face la adresa Destinatarului. Termenul mediu este 5-10 zile lucrătoare, în funcție de destinație și de programul curselor.",
      "Transportatorul anunță Destinatarul prin SMS / email înainte de livrare.",
    ],
  },
  {
    title: "7. Plata serviciilor",
    body: [
      "Plata se face de către Expeditor la momentul predării coletului, prin card sau numerar.",
      "În cazul în care Expeditorul optează pentru plata la livrare ('cash on delivery'), aceasta se va achita de către Destinatar la momentul primirii.",
      "Tarifele afișate includ TVA și sunt valabile la momentul predării coletului.",
    ],
  },
  {
    title: "8. Răspundere",
    body: [
      "Transportatorul răspunde pentru integritatea coletului pe durata transportului. Despăgubirea maximă în caz de pierdere sau deteriorare totală este de 200 EUR per colet, fără declarație de valoare.",
      "Transportatorul NU răspunde pentru: daune cauzate de ambalare necorespunzătoare, conținut nedeclarat sau ascuns, produse perisabile expediate fără opțiunea frigorifică, daune indirecte sau pierderi comerciale, întârzieri datorate forței majore (vamă, condiții meteo, restricții guvernamentale).",
    ],
  },
  {
    title: "9. Reclamații",
    body: [
      "Reclamațiile se depun în scris la info@davo.md în termen de maxim 7 zile de la primirea coletului, însoțite de: numărul rezervării, fotografii ale coletului deteriorat, copie act de identitate, descrierea problemei.",
      "Transportatorul va răspunde în maxim 14 zile lucrătoare de la primirea reclamației.",
    ],
  },
  {
    title: "10. Date personale",
    body: [
      "Datele furnizate de Expeditor și Destinatar (nume, adresă, telefon, email) sunt prelucrate exclusiv în scopul executării contractului de transport.",
      "Datele se păstrează pe durata necesară prestării serviciului și conform obligațiilor legale (contabilitate, legislație vamală).",
      "Pentru exercitarea drepturilor GDPR (acces, rectificare, ștergere): info@davo.md.",
    ],
  },
  {
    title: "11. Soluționarea litigiilor",
    body: [
      "Orice neînțelegere se soluționează pe cale amiabilă, prin contactarea Transportatorului.",
      "În caz de imposibilitate de soluționare amiabilă, litigiul se supune jurisdicției instanțelor competente din Republica Moldova.",
    ],
  },
  {
    title: "12. Contact",
    body: [
      "DAVO GROUP S.R.L.",
      "Sediu și punct de colectare: str. Calea Ieșilor 11/3, MD-2069, mun. Chișinău, Republica Moldova",
      "Program punct de colectare: marți 09:00–14:00 · miercuri 08:00–20:00 · joi 08:00–12:00",
      "Telefon: +373 68 065 699 · +373 76 041 855",
      "Email: info@davo.md",
    ],
  },
];

export default function TermeniColetePage() {
  return (
    <>
      <PageHero
        eyebrow="Termeni și condiții"
        title="Transport colete"
        description="Reguli și condiții pentru expedierea coletelor cu DAVO Group. Citește atent înainte de predarea coletului."
        tone="dark"
      />

      <section className="py-12 lg:py-16">
        <div className="container-page max-w-4xl">
          <Reveal>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <strong className="font-semibold">Notă: </strong>
              Prezentul document este o variantă draft, supusă revizuirii juridice. Pentru
              forma oficială finală, contactați-ne la <a href="mailto:info@davo.md" className="underline">info@davo.md</a>.
            </div>

            <p className="mt-6 text-sm text-[color:var(--ink-500)]">
              Ultima actualizare: <span className="font-semibold text-[color:var(--ink-700)]">{lastUpdated}</span>
            </p>
          </Reveal>

          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
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
