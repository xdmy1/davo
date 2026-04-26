"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SeatKind, SeatLayout } from "@/lib/adminMock";
import { Armchair, Bath, Minus, User as UserIcon } from "lucide-react";

export function SeatPicker({
  layout,
  occupiedSeats,
  selected,
  onSelect,
  max,
}: {
  layout: SeatLayout;
  occupiedSeats: number[];
  selected: number[];
  onSelect: (nums: number[]) => void;
  max: number;
}) {
  const occupied = useMemo(() => new Set(occupiedSeats), [occupiedSeats]);

  const seatNumbers = useMemo(() => {
    let n = 1;
    return layout.cells.map((c) => (c === "seat" ? n++ : null));
  }, [layout]);

  const toggle = (num: number) => {
    if (selected.includes(num)) {
      onSelect(selected.filter((x) => x !== num));
    } else if (selected.length < max) {
      onSelect([...selected, num]);
    } else {
      onSelect([...selected.slice(1), num]);
    }
  };

  return (
    <div className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--ink-500)]">
            Alege locul
          </div>
          <div className="mt-1 font-[family-name:var(--font-montserrat)] text-lg font-bold text-[color:var(--navy-900)]">
            Selectează scaunul în autocar
          </div>
        </div>
        <Legend />
      </div>

      <div className="mt-6 flex items-start gap-5">
        <div className="flex-1">
          <div className="mx-auto w-fit">
            <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
              <span className="h-px w-8 bg-[color:var(--ink-200)]" /> Față autocar
              <span className="h-px w-8 bg-[color:var(--ink-200)]" />
            </div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0,1fr))` }}
            >
              {layout.cells.map((kind, i) => {
                const num = seatNumbers[i];
                const isSeat = kind === "seat" && num !== null;
                const taken = isSeat && occupied.has(num!);
                const sel = isSeat && selected.includes(num!);
                return (
                  <Cell
                    key={i}
                    kind={kind}
                    num={num}
                    taken={taken}
                    selected={sel}
                    onClick={() => isSeat && !taken && toggle(num!)}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
              Spate autocar
            </div>
          </div>
        </div>

        <div className="hidden md:block w-48 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--ink-500)]">
            Selectat
          </div>
          <div className="mt-2 min-h-24 rounded-xl bg-[color:var(--ink-50)] border border-dashed border-[color:var(--ink-200)] p-3">
            {selected.length === 0 ? (
              <div className="text-sm text-[color:var(--ink-400)]">Niciun loc ales</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-md bg-[color:var(--red-500)] text-white font-mono font-bold text-xs px-2 py-1"
                  >
                    #{s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-[color:var(--ink-500)]">
            Selectate {selected.length} / {max}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({
  kind,
  num,
  taken,
  selected,
  onClick,
}: {
  kind: SeatKind;
  num: number | null;
  taken: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const isSeat = kind === "seat" && num !== null;
  const isDisabled = !isSeat || taken;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={
        kind === "seat" && num
          ? taken
            ? `Loc ${num} ocupat`
            : `Loc ${num}`
          : kind
      }
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-md border text-[10px] font-semibold transition",
        kind === "aisle" && "border-dashed border-[color:var(--ink-200)] bg-[color:var(--ink-50)] text-[color:var(--ink-400)] cursor-default",
        kind === "wc" && "border-blue-300 bg-blue-100 text-blue-700 cursor-default",
        kind === "driver" && "border-[color:var(--navy-900)] bg-[color:var(--navy-900)] text-white cursor-default",
        kind === "empty" && "border-dashed border-[color:var(--ink-200)] bg-transparent cursor-default",
        kind === "seat" && !taken && !selected &&
          "border-[color:var(--navy-500)]/40 bg-white text-[color:var(--navy-900)] hover:border-[color:var(--red-400)] hover:bg-[color:var(--red-50)] cursor-pointer",
        kind === "seat" && taken &&
          "border-[color:var(--ink-200)] bg-[color:var(--ink-100)] text-[color:var(--ink-400)] cursor-not-allowed",
        kind === "seat" && selected &&
          "border-[color:var(--red-500)] bg-[color:var(--red-500)] text-white shadow-[0_4px_12px_-4px_rgba(225,30,43,0.5)]"
      )}
    >
      <CellIcon kind={kind} />
      {isSeat && (
        <span className={cn(
          "absolute bottom-0.5 right-0.5 text-[9px] font-bold",
          selected ? "text-white" : taken ? "text-[color:var(--ink-400)]" : "text-[color:var(--navy-900)]/70"
        )}>
          {taken ? "×" : num}
        </span>
      )}
    </button>
  );
}

function CellIcon({ kind }: { kind: SeatKind }) {
  switch (kind) {
    case "seat":
      return <Armchair className="h-4 w-4 opacity-70" />;
    case "aisle":
      return <Minus className="h-3 w-3" />;
    case "wc":
      return <Bath className="h-4 w-4" />;
    case "driver":
      return <UserIcon className="h-4 w-4" />;
    case "empty":
      return null;
  }
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--ink-500)]">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-[color:var(--navy-500)]/40 bg-white" />
        Liber
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-[color:var(--red-500)]" />
        Selectat
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-[color:var(--ink-100)] border border-[color:var(--ink-200)]" />
        Ocupat
      </span>
    </div>
  );
}
