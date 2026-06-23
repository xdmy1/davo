"use client";

import { useState } from "react";
import { Armchair, Coffee, Bath, MoveVertical, Square, User as UserIcon, Headset } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { SeatPicker } from "@/components/booking/SeatPicker";
import type { SeatKind, SeatLayout } from "@/lib/adminMock";

// Schițe propuse pentru cele 2 autocare noi, codate ca SeatLayout. După ce
// user-ul confirmă, le aplicăm direct pe Bus-urile DAW 777 și ZNQ 374 cu un
// script de migrare. Pagina e READ-ONLY: nu se rezervă nimic de aici.

// Helper: construiește un layout dintr-un șir de string-uri, un caracter per
// celulă. Mai ușor de citit decât arrays imense.
//   S = seat, A = aisle, W = wc, D = driver, C = crew, T = table, F = cafe,
//   X = stairs, . = empty
function fromGrid(grid: string[], direction: "ltr" | "rtl" = "ltr"): SeatLayout {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const map: Record<string, SeatKind> = {
    S: "seat",
    A: "aisle",
    W: "wc",
    D: "driver",
    C: "crew",
    T: "table",
    F: "cafe",
    X: "stairs",
    ".": "empty",
  };
  const cells: SeatKind[] = [];
  for (const row of grid) {
    if (row.length !== cols) {
      throw new Error(`row "${row}" has ${row.length} chars, expected ${cols}`);
    }
    for (const ch of row) {
      const k = map[ch];
      if (!k) throw new Error(`Unknown cell char "${ch}"`);
      cells.push(k);
    }
  }
  return { rows, cols, cells, direction };
}

function countSeats(layout: SeatLayout): number {
  return layout.cells.filter((c) => c === "seat").length;
}

/* ──────────────── Autobuz 1: Van Hool TDX 27 Astromega · DAW 777 ──────────────── */
//
// Două etaje. Etajul inferior = VIP cu măsuțe face-to-face între primele 2
// rânduri (locurile 1-8 sunt premium +30 €/£), café în față + WC + scară jos.
// Etajul superior = 4 coloane standard, primele 4 locuri la geam sunt
// premium +30 €/£, 2 ieșiri intercalate, rând spate cu 5 locuri.
// Numerotare DREAPTA → STÂNGA pe fiecare rând (convenția UE).

const ASTROMEGA_DECK1 = fromGrid(
  [
    // 5 coloane: 2 pasageri | culoar | 2 pasageri
    ".D.C.", // șofer + însoțitor (echipaj)
    "..A..", // separator (front bus)
    "FFAFF", // două zone CAFÉ față-în-față (auxiliar)
    "SSASS", // rândul 1 VIP: locurile 1-4 (face-to-face cu rândul 2)
    "TTATT", // masă orizontală între cele 2 rânduri VIP (8 locuri premium)
    "SSASS", // rândul 2 VIP: locurile 5-8 (orientate spre rândul 1)
    "SSASS", // rândul 3: locurile 9-12
    "SSASS", // rândul 4: locurile 13-16
    "SSASS", // rândul 5: locurile 17-20
    "SSASS", // rândul 6 NOU: locurile 21-24
    "XWA..", // jos: scară (sus) + WC, restul gol
  ],
  "rtl",
);

const ASTROMEGA_DECK2 = fromGrid(
  [
    // 5 coloane: 2 pasageri | culoar | 2 pasageri
    "SSASS", // rândul 1: locuri 1-4 (premium +30, toate 4 la geam)
    "SSASS", // rândul 2: 5-8
    "SSASS", // rândul 3: 9-12
    "SSASS", // rândul 4: 13-16
    "..X..", // IEȘIRE 1 (după 4 rânduri) — scară spre etaj 1, fără seats
    "SSASS", // rândul 5: 17-20
    "SSASS", // rândul 6: 21-24
    "SSASS", // rândul 7: 25-28
    "SSASS", // rândul 8: 29-32
    "..X..", // IEȘIRE 2 (după alte 4 rânduri)
    "SSASS", // rândul 9: 33-36
    "SSASS", // rândul 10: 37-40
    "SSASS", // rândul 11: 41-44
    "SSASS", // rândul 12: 45-48
    "SSASS", // rândul 13 NOU: 49-52
    "SSASS", // rândul 14 NOU: 53-56
    "SSASS", // rândul 15 NOU: 57-60
    "SSSSS", // rândul spate: 61-65 (5 locuri pe toată lățimea)
  ],
  "rtl",
);

/* ──────────────── Autobuz 2: Van Hool TX 16 Alicron · ZNQ 374 ──────────────── */
//
// Single-deck, 4 coloane standard (2 + 2). Total: 51 locuri. WC + scară
// (ieșire) împreună pe DREAPTA-mijloc între cele 2 jumătăți. Rândul scurt
// din față zona mijlocului are doar 2 locuri pe stânga (lipsesc 2 pe dreapta,
// fac loc casetei WC). Ultimul rând spate are 5 locuri pe toată lățimea.
// Numerotare DREAPTA → STÂNGA (convenția europeană — ușa de îmbarcare pe
// dreapta).

const ALICRON_DECK = fromGrid(
  [
    // 5 coloane: 2 pasageri | culoar | 2 pasageri
    ".D.C.", // sus: șofer + însoțitor
    "..A..", // separator
    "SSASS", // rândul 1
    "SSASS", // rândul 2
    "SSASS", // rândul 3
    "SSASS", // rândul 4
    "SSASS", // rândul 5
    "SSASS", // rândul 6
    "SS...", // rândul 7: doar 2 locuri pe stânga (locurile dreapta scoase)
    "..AWX", // mijloc: gol stânga, culoar, WC + scară pe DREAPTA
    "SSASS", // rândul 8 (după WC)
    "SSASS", // rândul 9
    "SSASS", // rândul 10
    "SSASS", // rândul 11
    "SSASS", // rândul 12
    "SSSSS", // ultimul rând spate: 5 locuri pe toată lățimea
  ],
  "rtl",
);

export default function BusPreviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Schițe noi autocare"
        subtitle="Previzualizare nouă pentru DAW 777 (Astromega) și ZNQ 374 (Alicron). După ce confirmi, le aplicăm pe DB."
      />

      <BusCard
        name="Van Hool TDX 27 Astromega"
        plate="DAW 777"
        notes={[
          "Etajul 1 — VIP: primele 2 rânduri (locurile 1-8) au masă între ele (face-to-face, +30 €/£). Café în față, WC + scară jos. 24 locuri.",
          "Etajul 2 — standard: primele 4 locuri sunt premium la geam (+30 €/£). 2 ieșiri intercalate (după rândurile 4 și 8). Rândul spate are 5 locuri pe lățime. 65 locuri.",
          "Numerotare dreapta → stânga pe fiecare rând. Total: 89 locuri.",
        ]}
        decks={[
          { label: "Etajul 1 (VIP)", layout: ASTROMEGA_DECK1 },
          { label: "Etajul 2 (standard)", layout: ASTROMEGA_DECK2 },
        ]}
      />

      <BusCard
        name="Van Hool TX 16 Alicron"
        plate="ZNQ 374"
        notes={[
          "Single-deck, 4 coloane standard.",
          "WC + scară (ieșire) la mijloc între cele 2 jumătăți.",
        ]}
        decks={[{ label: "Etaj unic", layout: ALICRON_DECK }]}
      />

      <Legend />
    </div>
  );
}

function BusCard({
  name,
  plate,
  notes,
  decks,
}: {
  name: string;
  plate: string;
  notes: string[];
  decks: { label: string; layout: SeatLayout }[];
}) {
  const totalSeats = decks.reduce((s, d) => s + countSeats(d.layout), 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{name}</h2>
          <div className="mt-0.5 text-sm font-mono text-slate-500">{plate}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-orange-600">{totalSeats}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            locuri
          </div>
        </div>
      </div>
      <ul className="mb-4 space-y-1 text-xs text-slate-600">
        {notes.map((n) => (
          <li key={n}>• {n}</li>
        ))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-2">
        {decks.map((d) => (
          <DeckPreview key={d.label} label={d.label} layout={d.layout} />
        ))}
      </div>
    </div>
  );
}

function DeckPreview({ label, layout }: { label: string; layout: SeatLayout }) {
  const seats = countSeats(layout);
  // SeatPicker în mod read-only: niciun loc ocupat, niciun loc selectabil.
  // Pentru preview vrem doar să vizualizăm forma layout-ului.
  const [, setSelected] = useState<number[]>([]);
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</div>
        <div className="text-[11px] text-slate-500">{seats} locuri</div>
      </div>
      <SeatPicker
        layout={layout}
        occupiedSeats={[]}
        selected={[]}
        onSelect={setSelected}
        max={0}
      />
    </div>
  );
}

function Legend() {
  const items: { kind: SeatKind; label: string; icon: React.ReactNode }[] = [
    { kind: "seat", label: "Loc pasager", icon: <Armchair className="h-3.5 w-3.5" /> },
    { kind: "driver", label: "Șofer", icon: <UserIcon className="h-3.5 w-3.5" /> },
    { kind: "crew", label: "Însoțitor", icon: <Headset className="h-3.5 w-3.5" /> },
    { kind: "wc", label: "WC", icon: <Bath className="h-3.5 w-3.5" /> },
    { kind: "cafe", label: "Café / bar", icon: <Coffee className="h-3.5 w-3.5" /> },
    { kind: "table", label: "Masă VIP", icon: <Square className="h-3.5 w-3.5" /> },
    { kind: "stairs", label: "Scară / ieșire", icon: <MoveVertical className="h-3.5 w-3.5" /> },
  ];
  const tone: Record<string, string> = {
    seat: "bg-white border-slate-300",
    driver: "bg-slate-900 border-slate-900 text-white",
    crew: "bg-slate-100 border-slate-400",
    wc: "bg-blue-100 border-blue-300 text-blue-700",
    cafe: "bg-orange-50 border-orange-300 text-orange-700",
    table: "bg-slate-100 border-slate-300 text-slate-500",
    stairs: "bg-amber-50 border-amber-300 text-amber-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Legendă</div>
      <div className="flex flex-wrap gap-3">
        {items.map((it) => (
          <div key={it.kind} className="flex items-center gap-1.5 text-xs text-slate-700">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded border ${tone[it.kind]}`}
            >
              {it.icon}
            </span>
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}
