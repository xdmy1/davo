"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";

// Raportul lunar per furnizor/agenție parteneră: alegi luna (după data
// plecării), vezi câți pasageri a adus fiecare agenție și verifici raportul
// lor rând cu rând înainte de plata comisionului.

type SummaryRow = {
  furnizor: string;
  bookings: number;
  persons: number;
  totals: Record<string, number>;
};

type BookingRow = {
  id: string;
  bookingNumber: string;
  type: string;
  status: string;
  firstName: string;
  lastName: string;
  phone: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  adults: number;
  children: number;
  price: number;
  currency: string;
};

const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTotals(totals: Record<string, number>) {
  const parts = Object.entries(totals).map(([cur, sum]) => {
    const symbol = cur === "GBP" ? "£" : cur === "EUR" ? "€" : cur;
    return `${Math.round(sum * 100) / 100} ${symbol}`;
  });
  return parts.length > 0 ? parts.join(" + ") : "—";
}

export default function FurnizoriPage() {
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (selected) params.set("furnizor", selected);
      const res = await fetch(`/api/admin/furnizori?${params}`);
      const data = await res.json();
      if (data?.success) {
        setSummary(data.summary ?? []);
        setNames(data.names ?? []);
        setBookings(data.bookings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [month, selected]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRow = selected ? summary.find((s) => s.furnizor === selected) : null;

  return (
    <div>
      <PageHeader
        title="Furnizori"
        subtitle="Pasagerii aduși de agențiile partenere — raport lunar pentru comision"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Luna</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Furnizor</span>
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value || null)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 max-w-[240px]"
          >
            <option value="">Toți furnizorii</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-xs text-slate-500">
          Luna = data plecării · rezervările anulate nu intră în raport
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : summary.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Niciun pasager de la furnizori în luna aleasă"
          description="Setează câmpul „Furnizor” pe rezervări (la creare sau editare) și vor apărea aici, grupate pe agenție."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Furnizor</th>
                    <th className="px-5 py-3 text-left">Rezervări</th>
                    <th className="px-5 py-3 text-left">Persoane</th>
                    <th className="px-5 py-3 text-left">Valoare bilete</th>
                    <th className="px-5 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.map((row) => (
                    <tr key={row.furnizor} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                          <Briefcase className="h-4 w-4 text-orange-500" />
                          {row.furnizor}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{row.bookings}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {row.persons}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{formatTotals(row.totals)}</td>
                      <td className="px-5 py-3 text-right">
                        {selected !== row.furnizor && (
                          <button
                            onClick={() => setSelected(row.furnizor)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Vezi pasagerii
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selected && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Pasagerii de la {selected}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedRow
                      ? `${selectedRow.bookings} rezervări · ${selectedRow.persons} persoane · ${formatTotals(selectedRow.totals)}`
                      : "—"}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Înapoi la toți
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Rezervare</th>
                      <th className="px-5 py-3 text-left">Pasager</th>
                      <th className="px-5 py-3 text-left">Rută</th>
                      <th className="px-5 py-3 text-left">Plecare</th>
                      <th className="px-5 py-3 text-left">Persoane</th>
                      <th className="px-5 py-3 text-left">Preț</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono font-semibold text-slate-900">{b.bookingNumber}</td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-900">
                            {b.firstName} {b.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{b.phone}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {b.departureCity} → {b.arrivalCity}
                        </td>
                        <td className="px-5 py-3 text-slate-700">{dateFmt.format(new Date(b.departureDate))}</td>
                        <td className="px-5 py-3 text-slate-700">
                          {b.type === "passenger" ? b.adults + b.children : "colet"}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {b.price} {b.currency === "GBP" ? "£" : b.currency === "EUR" ? "€" : b.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
