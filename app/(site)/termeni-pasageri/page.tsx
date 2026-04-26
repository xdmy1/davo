import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Termeni și condiții — Călătorie pasageri | DAVO Group",
  description:
    "Termenii și condițiile de transport al pasagerilor cu autocar DAVO Group din Moldova spre Europa.",
};

const lastUpdated = "2026-04-26";

const sections = [
  {
    title: "1. Definiții",
    body: [
      "'Transportator' — DAVO GROUP S.R.L., entitatea care prestează serviciul de transport.",
      "'Pasager' — persoana care a achiziționat un bilet și călătorește cu autocarul nostru.",
      "'Bilet' — documentul electronic sau fizic care confirmă rezervarea și achitarea cursei.",
      "'Cursă' — deplasarea programată a unui autocar pe o rută specifică, la o dată și oră anume.",
    ],
  },
  {
    title: "2. Obiectul contractului",
    body: [
      "Transportatorul se obligă să transporte Pasagerul de la punctul de plecare la cel de destinație, conform datelor înscrise pe bilet.",
      "Prin achiziționarea biletului, Pasagerul confirmă că a luat cunoștință și acceptă prezenții termeni și condiții, precum și regulile de comportament la bord.",
    ],
  },
  {
    title: "3. Rezervarea și achitarea",
    body: [
      "Rezervarea se face online pe site-ul davo.md, telefonic sau direct la oficiul Transportatorului.",
      "Biletul devine valabil doar după achitarea integrală a sumei. Plata se acceptă cu cardul, prin transfer bancar sau în numerar la îmbarcare (acolo unde e disponibil).",
      "Tarifele afișate pe site includ TVA și sunt valabile la momentul rezervării. Transportatorul își rezervă dreptul de a modifica tarifele pentru rezervările viitoare.",
    ],
  },
  {
    title: "4. Documente necesare",
    body: [
      "Pasagerul este obligat să prezinte la îmbarcare actul de identitate / pașaport valabil, conform legislației țărilor traversate.",
      "Pentru călătoriile internaționale, Pasagerul răspunde personal de valabilitatea documentelor de călătorie (pașaport, viză, asigurare medicală, etc.).",
      "Transportatorul nu poate fi tras la răspundere în caz de refuz al autorităților vamale sau de frontieră. În acest caz, suma achitată nu se rambursează.",
    ],
  },
  {
    title: "5. Bagaje",
    body: [
      "Fiecare Pasager are dreptul la 1 bagaj de cală (max. 35 kg) și 1 bagaj de mână (max. 5 kg), incluse în prețul biletului.",
      "Bagaje suplimentare se acceptă contra cost, în limita spațiului disponibil. Tariful și condițiile sunt comunicate în prealabil.",
      "Sunt INTERZISE la transport: substanțe inflamabile, explozive, toxice, arme, droguri, animale vii (excepție animale de companie cu acordul prealabil), produse alimentare ușor alterabile fără ambalaj corespunzător.",
      "Transportatorul nu răspunde de obiectele de valoare (bani, bijuterii, documente, electronice) lăsate în bagajul de cală.",
    ],
  },
  {
    title: "6. Anularea și modificarea rezervării",
    body: [
      "Anulare cu mai mult de 7 zile înainte de plecare: rambursare 100%.",
      "Anulare cu 3-7 zile înainte de plecare: rambursare 70%.",
      "Anulare cu mai puțin de 72h înainte de plecare: rambursare 30%.",
      "Anulare cu mai puțin de 24h sau no-show: nu se rambursează.",
      "Modificarea datei sau rutei se face gratuit cu minim 7 zile înainte, în limita locurilor disponibile. Diferența de tarif (dacă există) se achită la modificare.",
    ],
  },
  {
    title: "7. Întârzieri și forță majoră",
    body: [
      "Transportatorul depune toate eforturile pentru respectarea orarului. Întârzierile cauzate de condițiile meteo, ambuteiaje, controale de frontieră sau alte cauze independente de Transportator NU dau dreptul la compensații.",
      "În caz de forță majoră (război, dezastre naturale, restricții guvernamentale, etc.) Transportatorul poate anula sau reprograma cursa fără penalități, cu rambursarea integrală a sumei achitate.",
    ],
  },
  {
    title: "8. Comportament la bord",
    body: [
      "Pasagerul este obligat să respecte indicațiile șoferului și ale însoțitorului de bord.",
      "Sunt INTERZISE: consumul de alcool excesiv, fumatul (inclusiv țigări electronice), comportamentul agresiv față de personal sau alți pasageri, deteriorarea bunurilor.",
      "Transportatorul își rezervă dreptul de a refuza îmbarcarea sau de a debarca un Pasager care încalcă aceste reguli, fără rambursarea biletului.",
    ],
  },
  {
    title: "9. Răspunderea Transportatorului",
    body: [
      "Transportatorul răspunde pentru integritatea Pasagerului pe durata călătoriei, conform legislației Republicii Moldova și a țărilor tranzitate.",
      "În caz de pierdere sau deteriorare a bagajului din vina Transportatorului, despăgubirea maximă este de 100 EUR per bagaj de cală, contra prezentării actului de cumpărare.",
      "Pentru daune mai mari, recomandăm încheierea unei asigurări de călătorie pe cont propriu.",
    ],
  },
  {
    title: "10. Date personale",
    body: [
      "Datele furnizate la rezervare (nume, telefon, email, document de identitate) sunt prelucrate exclusiv în scopul executării contractului de transport, conform legislației privind protecția datelor cu caracter personal (GDPR / Legea nr. 133 a R. Moldova).",
      "Pasagerul are dreptul de acces, rectificare, ștergere și opoziție prin solicitare la info@davo.md.",
    ],
  },
  {
    title: "11. Soluționarea litigiilor",
    body: [
      "Orice neînțelegere se soluționează pe cale amiabilă, prin contactarea Transportatorului la info@davo.md sau telefonic la +373 68 065 699.",
      "În caz de imposibilitate de soluționare amiabilă, litigiul se supune jurisdicției instanțelor de judecată competente din Republica Moldova.",
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

export default function TermeniPasageriPage() {
  return (
    <>
      <PageHero
        eyebrow="Termeni și condiții"
        title="Călătorie pasageri"
        description="Reguli și condiții pentru transportul cu autocar DAVO Group. Citește atent înainte de rezervare."
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
