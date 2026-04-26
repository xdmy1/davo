"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SeatKind } from "@/lib/adminMock";
import { Armchair, User, Bath, Minus } from "lucide-react";

const cycle: Record<SeatKind, SeatKind> = {
  seat: "aisle",
  aisle: "wc",
  wc: "empty",
  empty: "driver",
  driver: "seat",
};

type Layout = { rows: number; cols: number; cells: SeatKind[] };

const tools: { kind: SeatKind; label: string }[] = [
  { kind: "seat", label: "Scaun" },
  { kind: "aisle", label: "Culoar" },
  { kind: "wc", label: "Toaletă" },
  { kind: "driver", label: "Șofer" },
  { kind: "empty", label: "Gol" },
];

function cellClasses(kind: SeatKind) {
  switch (kind) {
    case "seat":
      return "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200";
    case "aisle":
      return "bg-slate-100 border-dashed border-slate-300 text-slate-400";
    case "wc":
      return "bg-blue-100 border-blue-300 text-blue-700";
    case "driver":
      return "bg-slate-900 border-slate-900 text-white";
    case "empty":
      return "bg-transparent border-dashed border-slate-200 text-slate-300";
  }
}

function CellIcon({ kind }: { kind: SeatKind }) {
  switch (kind) {
    case "seat":
      return <Armchair className="h-4 w-4" />;
    case "aisle":
      return <Minus className="h-3 w-3" />;
    case "wc":
      return <Bath className="h-4 w-4" />;
    case "driver":
      return <User className="h-4 w-4" />;
    case "empty":
      return null;
  }
}

export default function SeatMapEditor({
  initial,
  onChange,
}: {
  initial: Layout;
  onChange?: (next: Layout) => void;
}) {
  const [layout, setLayout] = useState<Layout>(initial);
  const [tool, setTool] = useState<SeatKind | null>(null);

  const seatCount = useMemo(
    () => layout.cells.filter((c) => c === "seat").length,
    [layout]
  );

  function setCell(i: number) {
    const next: Layout = {
      ...layout,
      cells: layout.cells.slice(),
    };
    next.cells[i] = tool ?? cycle[layout.cells[i]];
    setLayout(next);
    onChange?.(next);
  }

  function numberedSeats() {
    let n = 1;
    return layout.cells.map((c) => (c === "seat" ? n++ : null));
  }
  const numbers = numberedSeats();

  function resize(delta: { rows?: number; cols?: number }) {
    const rows = Math.max(1, Math.min(30, layout.rows + (delta.rows ?? 0)));
    const cols = Math.max(1, Math.min(10, layout.cols + (delta.cols ?? 0)));
    const cells: SeatKind[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const oldIdx = r * layout.cols + c;
        cells.push(r < layout.rows && c < layout.cols ? layout.cells[oldIdx] : "empty");
      }
    }
    const next = { rows, cols, cells };
    setLayout(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Unealtă:
        </span>
        {tools.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setTool(t.kind === tool ? null : t.kind)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              tool === t.kind
                ? "border-orange-400 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <span className={cn("flex h-5 w-5 items-center justify-center rounded border", cellClasses(t.kind))}>
              <CellIcon kind={t.kind} />
            </span>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-900">{seatCount}</span> scaune ·
          <span>{layout.rows}r × {layout.cols}c</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 overflow-auto">
        <div className="mx-auto w-fit">
          <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="h-px w-8 bg-slate-200" /> Față autocar <span className="h-px w-8 bg-slate-200" />
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0,1fr))` }}
          >
            {layout.cells.map((kind, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCell(i)}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-md border text-[10px] font-semibold transition",
                  cellClasses(kind)
                )}
                title={`${kind}${numbers[i] ? ` #${numbers[i]}` : ""}`}
              >
                <CellIcon kind={kind} />
                {numbers[i] && (
                  <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold opacity-70">
                    {numbers[i]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Spate autocar
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Dimensiuni:
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-600">Rânduri</span>
          <button type="button" onClick={() => resize({ rows: -1 })} className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">-</button>
          <span className="w-6 text-center text-xs font-semibold">{layout.rows}</span>
          <button type="button" onClick={() => resize({ rows: 1 })} className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">+</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-600">Coloane</span>
          <button type="button" onClick={() => resize({ cols: -1 })} className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">-</button>
          <span className="w-6 text-center text-xs font-semibold">{layout.cols}</span>
          <button type="button" onClick={() => resize({ cols: 1 })} className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">+</button>
        </div>
      </div>
    </div>
  );
}
