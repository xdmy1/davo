import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import {
  MD_PICKUPS_BY_COUNTRY,
  EU_PICKUPS_BY_COUNTRY,
  computePickupTimes,
  weekdayWithShift,
  type ComputedStop,
} from "@/lib/pickupTimes";
import { busPlateForCountry, extraOutboundDays } from "@/lib/busSchedule";

// Orar complet de ridicare: fiecare oraș de pe site, din orice țară, pe ambele
// direcții (MD→EU și EU→MD), cu ora calculată din ora-ancoră a țării (admin →
// Țări) + offsetul orașului (lib/pickupTimes.ts).
export const dynamic = "force-dynamic";

const COUNTRY_ORDER = ["Anglia", "Germania", "Belgia", "Olanda", "Luxemburg"];

type CountryRow = {
  name: string;
  outboundWeekday: number | null;
  outboundTime: string | null;
  returnWeekday: number | null;
  returnTime: string | null;
};

function StopsTable({
  stops,
  weekday,
  emptyNote,
}: {
  stops: ComputedStop[];
  weekday: number | null;
  emptyNote: string;
}) {
  if (stops.length === 0) {
    return <p className="px-5 py-4 text-sm text-slate-500">{emptyNote}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
        <tr>
          <th className="px-5 py-2.5 text-left">#</th>
          <th className="px-5 py-2.5 text-left">Oraș</th>
          <th className="px-5 py-2.5 text-left">Ziua</th>
          <th className="px-5 py-2.5 text-left">Ora ridicării</th>
          <th className="px-5 py-2.5 text-left">Offset</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {stops.map((s, i) => (
          <tr key={s.city} className="hover:bg-slate-50">
            <td className="px-5 py-2 text-xs text-slate-400">{i + 1}</td>
            <td className="px-5 py-2 font-medium text-slate-900">{s.city}</td>
            <td className="px-5 py-2 text-slate-600">
              {weekdayWithShift(weekday, s.dayShift)}
              {s.dayShift > 0 && (
                <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  +{s.dayShift} {s.dayShift === 1 ? "zi" : "zile"}
                </span>
              )}
            </td>
            <td className="px-5 py-2 font-mono font-semibold text-slate-900">{s.time}</td>
            <td className="px-5 py-2 text-xs text-slate-500">
              {s.offsetMin === 0 ? "ancoră" : `+${Math.floor(s.offsetMin / 60)}h${String(s.offsetMin % 60).padStart(2, "0")}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DirectionCard({
  title,
  subtitle,
  stops,
  weekday,
  emptyNote,
}: {
  title: string;
  subtitle: string;
  stops: ComputedStop[];
  weekday: number | null;
  emptyNote: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <StopsTable stops={stops} weekday={weekday} emptyNote={emptyNote} />
      </div>
    </div>
  );
}

export default async function OrarePage() {
  const rows = await prisma.country.findMany({
    where: { name: { not: "Moldova" } },
    select: {
      name: true,
      outboundWeekday: true,
      outboundTime: true,
      returnWeekday: true,
      returnTime: true,
    },
  });
  const byName = new Map(rows.map((r) => [r.name, r as CountryRow]));
  const countries = COUNTRY_ORDER.filter((n) => byName.has(n)).concat(
    rows.map((r) => r.name).filter((n) => !COUNTRY_ORDER.includes(n))
  );

  return (
    <div>
      <PageHeader
        title="Orar ridicări"
        subtitle="Ora de îmbarcare pentru fiecare oraș de pe site, pe ambele direcții — calculată din programul țării + offsetul orașului"
      />

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <strong>Offseturile per oraș sunt ESTIMĂRI</strong> (timpi de condus, în ordinea rutei) — de
        verificat cu șoferii. Ordinea prin Moldova e cea confirmată (sudul întâi, apoi nordul); ordinea
        prin țările străine e dedusă geografic. Ora-ancoră a fiecărei țări vine din „Țări &amp; program”;
        un offset se corectează în <code className="rounded bg-amber-100 px-1.5 py-0.5">lib/pickupTimes.ts</code>.
      </div>

      <div className="space-y-10">
        {countries.map((name) => {
          const c = byName.get(name)!;
          const mdStops = computePickupTimes(c.outboundTime, MD_PICKUPS_BY_COUNTRY[name] ?? []);
          const euStops = computePickupTimes(c.returnTime, EU_PICKUPS_BY_COUNTRY[name] ?? []);
          const plate = busPlateForCountry(name);
          const extra = extraOutboundDays(name);
          return (
            <section key={name}>
              <div className="mb-3 flex flex-wrap items-baseline gap-3">
                <h2 className="text-lg font-bold text-slate-900">{name}</h2>
                {plate && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {plate}
                  </span>
                )}
                {extra.map((e) => (
                  <span key={e.plate} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    + dus și {weekdayWithShift(e.weekday, 0)} {e.time} ({e.plate})
                  </span>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <DirectionCard
                  title={`Moldova → ${name} (dus)`}
                  subtitle={
                    c.outboundTime
                      ? `Ancoră: ${weekdayWithShift(c.outboundWeekday, 0)} ${c.outboundTime}, plecarea din Chișinău (ora Moldovei)`
                      : "Fără program setat în „Țări & program” — orele nu se pot calcula"
                  }
                  stops={mdStops}
                  weekday={c.outboundWeekday}
                  emptyNote="Niciun oraș MD definit pentru țara asta."
                />
                <DirectionCard
                  title={`${name} → Moldova (retur)`}
                  subtitle={
                    c.returnTime
                      ? `Ancoră: ${weekdayWithShift(c.returnWeekday, 0)} ${c.returnTime}, plecarea din ${
                          (EU_PICKUPS_BY_COUNTRY[name] ?? [])[0]?.city ?? "primul oraș"
                        } (ora locală)`
                      : "Fără program setat în „Țări & program” — orele nu se pot calcula"
                  }
                  stops={euStops}
                  weekday={c.returnWeekday}
                  emptyNote="Niciun oraș definit pentru țara asta."
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
