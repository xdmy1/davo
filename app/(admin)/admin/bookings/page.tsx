"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  Eye,
  Mail,
  Download,
  Filter,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/admin/Badge";
import { statusMeta } from "@/lib/adminLabels";
import { destinations, moldovanCities } from "@/lib/data";

type Booking = {
  id: string;
  bookingNumber: string;
  type: "passenger" | "parcel";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  price: number;
  currency: string;
  createdAt: string;
  emailSent: boolean;
  passengerResponse: "confirmed" | "cancelled" | null;
  passengerResponseAt: string | null;
};

const responseOptions = [
  { value: "confirmed", label: "A confirmat", variant: "green" as const, icon: "✓" },
  { value: "cancelled", label: "A anulat din email", variant: "red" as const, icon: "✗" },
];

const statusOptions = [
  { value: "pending", label: "În așteptare" },
  { value: "confirmed", label: "Confirmată" },
  { value: "cancelled", label: "Anulată" },
  { value: "completed", label: "Finalizată" },
];

// Lookup oraș → țară. Pornim de la `destinations` (orașele străine) și adăugăm
// Moldova pentru toate orașele moldovene + Chișinău (default origin). Cheile
// sunt normalizate (lowercase + diacritice scoase) pentru a tolera variații.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const cityToCountry: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const d of destinations) {
    for (const c of d.cities) m.set(normalize(c.name), d.name);
  }
  for (const c of moldovanCities) m.set(normalize(c.name), "Moldova");
  m.set(normalize("Chișinău"), "Moldova");
  m.set(normalize("Chisinau"), "Moldova");
  return m;
})();

const COUNTRY_OPTIONS = ["Moldova", ...destinations.map((d) => d.name)];

// Pentru flow-ul colet-la-cheie arrivalCity e formatată ca "Oraș, Țară" —
// extragem partea după ultima virgulă dacă pică în lista cunoscută.
function countryOf(city: string): string | null {
  const direct = cityToCountry.get(normalize(city));
  if (direct) return direct;
  const idx = city.lastIndexOf(",");
  if (idx >= 0) {
    const tail = city.slice(idx + 1).trim();
    if (COUNTRY_OPTIONS.some((c) => normalize(c) === normalize(tail))) return tail;
    const lookup = cityToCountry.get(normalize(tail));
    if (lookup) return lookup;
  }
  return null;
}

type PeriodFilter = "all" | "today" | "this_week" | "next_week" | "this_month";

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "Orice perioadă" },
  { value: "today", label: "Astăzi" },
  { value: "this_week", label: "Săptămâna aceasta" },
  { value: "next_week", label: "Săptămâna viitoare" },
  { value: "this_month", label: "Luna aceasta" },
];

// Range cu zilele de Luni 00:00 → Duminică 23:59:59.999 ale săptămânii care
// conține `ref`. Folosit pentru filtrul „săptămâna aceasta / viitoare” pe
// departureDate. Săptămâna ISO (Luni e prima zi) — convenția RO.
function isoWeekRange(ref: Date): { start: Date; end: Date } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);
  return { start, end };
}

function periodRange(p: PeriodFilter, now: Date): { start: Date; end: Date } | null {
  if (p === "all") return null;
  if (p === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);
    return { start, end };
  }
  if (p === "this_week") return isoWeekRange(now);
  if (p === "next_week") {
    const next = new Date(now);
    next.setDate(next.getDate() + 7);
    return isoWeekRange(next);
  }
  // this_month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  end.setMilliseconds(-1);
  return { start, end };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [responseFilter, setResponseFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  // Filtru pe dată exactă a plecării (YYYY-MM-DD). Când e setat, înlocuiește
  // filtrul de perioadă presetată — userul a ales o zi anume.
  const [dateFilter, setDateFilter] = useState<string>("");

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (data?.success) setBookings(data.bookings);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchBookings();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleResendEmail(id: string) {
    try {
      const res = await fetch(`/api/admin/bookings/${id}/resend-email`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Email retrimis cu succes!");
        fetchBookings();
      }
    } catch {
      alert("Eroare la retrimiterea emailului");
    }
  }

  const range = periodRange(periodFilter, new Date());
  const filtered = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      b.bookingNumber.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.phone.includes(searchQuery) ||
      `${b.firstName} ${b.lastName}`.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesType = typeFilter === "all" || b.type === typeFilter;
    const matchesResponse =
      responseFilter === "all" ||
      (responseFilter === "none"
        ? !b.passengerResponse
        : b.passengerResponse === responseFilter);
    let matchesPeriod = true;
    if (dateFilter) {
      // Comparăm doar partea de dată (YYYY-MM-DD) — ignorăm ora ca să prindem
      // toate cursele din ziua aleasă, indiferent de ora plecării.
      const dep = new Date(b.departureDate);
      const depKey = `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, "0")}-${String(dep.getDate()).padStart(2, "0")}`;
      matchesPeriod = depKey === dateFilter;
    } else if (range) {
      const dep = new Date(b.departureDate);
      matchesPeriod = dep >= range.start && dep <= range.end;
    }
    const matchesCountry =
      countryFilter === "all" ||
      countryOf(b.departureCity) === countryFilter ||
      countryOf(b.arrivalCity) === countryFilter;
    return matchesSearch && matchesStatus && matchesType && matchesResponse && matchesPeriod && matchesCountry;
  });

  return (
    <div>
      <PageHeader
        title="Rezervări"
        subtitle={`${bookings.length} înregistrări în baza de date`}
        actions={
          <>
            <button
              onClick={fetchBookings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Actualizare
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => alert("Export CSV — conectăm când avem DB finală")}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Caută după număr, email, telefon sau nume…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Filtre:
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="all">Toate statusurile</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="all">Toate tipurile</option>
          <option value="passenger">Pasageri</option>
          <option value="parcel">Colete</option>
        </select>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
          disabled={!!dateFilter}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
          title={dateFilter ? "Dezactivat — filtrul de dată exactă e activ" : "Filtrează după data plecării"}
        >
          {periodOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            title="Dată exactă a plecării"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
              title="Șterge filtrul de dată"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          title="Filtrează după țara de plecare sau destinație"
        >
          <option value="all">Toate țările</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={responseFilter}
          onChange={(e) => setResponseFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          title="Filtrează după răspunsul pasagerului din email (V/X)"
        >
          <option value="all">Toate răspunsurile</option>
          <option value="confirmed">A confirmat</option>
          <option value="cancelled">A anulat din email</option>
          <option value="none">Niciun răspuns</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Nr. rezervare</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Rută</th>
                <th className="px-5 py-3 text-left">Dată</th>
                <th className="px-5 py-3 text-left">Preț</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Răspuns pasager</th>
                <th className="px-5 py-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-500">
                    Nu s-au găsit rezervări cu filtrele curente.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((b) => {
                  const meta = statusMeta[b.status] ?? statusMeta.pending;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {b.bookingNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {b.type === "passenger" ? "Pasageri" : "Colete"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">
                          {b.firstName} {b.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{b.phone}</div>
                        <div className="text-xs text-slate-400">{b.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-900">{b.departureCity}</span>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <span className="font-medium text-slate-900">{b.arrivalCity}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {new Date(b.departureDate).toLocaleDateString("ro-RO")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">
                          {b.price} {b.currency}
                        </div>
                        <div className={`text-xs ${b.emailSent ? "text-emerald-600" : "text-red-500"}`}>
                          {b.emailSent ? "Email trimis" : "Email netrimis"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={b.status}
                          onChange={(e) => handleStatusChange(b.id, e.target.value)}
                          className="rounded-full border border-transparent bg-transparent px-0 py-0 text-xs font-semibold focus:outline-none"
                        >
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <div className="mt-1">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {(() => {
                          const opt = responseOptions.find((o) => o.value === b.passengerResponse);
                          if (!opt) {
                            return (
                              <Badge variant="slate" className="text-slate-500">
                                — Niciun răspuns
                              </Badge>
                            );
                          }
                          const at = b.passengerResponseAt
                            ? new Date(b.passengerResponseAt).toLocaleString("ro-RO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "";
                          return (
                            <span title={at ? `Răspuns la ${at}` : ""}>
                              <Badge variant={opt.variant}>
                                {opt.icon} {opt.label}
                              </Badge>
                              {at && (
                                <div className="mt-0.5 text-[11px] text-slate-400">{at}</div>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/bilet/${b.bookingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-orange-600"
                            title="Vezi biletul"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleResendEmail(b.id)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-orange-600"
                            title="Retrimite email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500">
            Se afișează primele 100 din {filtered.length} rezervări
          </div>
        )}
      </div>
    </div>
  );
}
