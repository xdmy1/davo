import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFleet, getCounters, getVehicleCounters } from "@/lib/gelios";
import { computeMaintenance, maintSeverity, type MaintStatus } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

// GET — dashboard: flota din Gelios + odometru live + punctele de mentenanță
// per vehicul, cu starea calculată (verde/galben/roșu).
export async function GET() {
  try {
    const now = Date.now();
    const [{ vehicles: fleet }, items] = await Promise.all([
      getFleet(),
      prisma.maintenanceItem.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Contoare pentru toate unitățile din flotă (odometru + ore motor), cache 5m.
    const counters = await getCounters(fleet.map((v) => v.id), now);

    const vehicles = fleet.map((v) => {
      const c = counters[v.id] ?? { mileageKm: null, engineHours: null };
      const computed = items
        .filter((i) => i.geliosUnitId === v.id)
        .map((i) =>
          computeMaintenance(
            {
              id: i.id,
              geliosUnitId: i.geliosUnitId,
              vehicleName: i.vehicleName,
              type: i.type,
              intervalKm: i.intervalKm,
              intervalDays: i.intervalDays,
              lastServiceKm: i.lastServiceKm,
              lastServiceAt: i.lastServiceAt,
              notes: i.notes,
              active: i.active,
            },
            c.mileageKm,
            now
          )
        )
        .sort((a, b) => maintSeverity(b.status) - maintSeverity(a.status) || a.type.localeCompare(b.type, "ro"));

      const worst: MaintStatus = computed.reduce<MaintStatus>(
        (acc, it) => (maintSeverity(it.status) > maintSeverity(acc) ? it.status : acc),
        computed.length ? "ok" : "unknown"
      );

      return {
        id: v.id,
        name: v.name,
        status: v.status,
        ageSec: v.ageSec,
        odometerKm: c.mileageKm,
        engineHours: c.engineHours,
        items: computed,
        worst,
        counts: {
          overdue: computed.filter((i) => i.status === "overdue").length,
          soon: computed.filter((i) => i.status === "soon").length,
          ok: computed.filter((i) => i.status === "ok").length,
        },
      };
    });

    const all = vehicles.flatMap((v) => v.items);
    const summary = {
      vehicles: fleet.length,
      items: all.length,
      overdue: all.filter((i) => i.status === "overdue").length,
      soon: all.filter((i) => i.status === "soon").length,
      ok: all.filter((i) => i.status === "ok").length,
      unknown: all.filter((i) => i.status === "unknown").length,
    };

    return NextResponse.json({ success: true, vehicles, summary, fetchedAt: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare mentenanță";
    console.error("maintenance GET", error);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

// POST — creează un punct de mentenanță. Dacă `lastServiceKm` lipsește și există
// interval km, îl setăm la odometrul curent din Gelios (resetare „de acum").
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const geliosUnitId = Number(body.geliosUnitId);
    const vehicleName = String(body.vehicleName ?? "").trim();
    const type = String(body.type ?? "").trim();
    const intervalKm = body.intervalKm != null && body.intervalKm !== "" ? Math.round(Number(body.intervalKm)) : null;
    const intervalDays = body.intervalDays != null && body.intervalDays !== "" ? Math.round(Number(body.intervalDays)) : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!Number.isFinite(geliosUnitId) || !vehicleName || !type) {
      return NextResponse.json({ success: false, error: "Vehicul și tip sunt obligatorii" }, { status: 400 });
    }
    if (!intervalKm && !intervalDays) {
      return NextResponse.json({ success: false, error: "Setează cel puțin un interval (km sau zile)" }, { status: 400 });
    }
    if ((intervalKm !== null && intervalKm <= 0) || (intervalDays !== null && intervalDays <= 0)) {
      return NextResponse.json({ success: false, error: "Intervalele trebuie să fie pozitive" }, { status: 400 });
    }

    const lastServiceAt = body.lastServiceAt ? new Date(body.lastServiceAt) : new Date();
    if (Number.isNaN(lastServiceAt.getTime())) {
      return NextResponse.json({ success: false, error: "Dată invalidă" }, { status: 400 });
    }

    let lastServiceKm: number | null =
      body.lastServiceKm != null && body.lastServiceKm !== "" ? Number(body.lastServiceKm) : null;
    // Fallback inteligent: dacă e interval pe km și nu s-a dat odometrul, îl luăm live din Gelios.
    if (lastServiceKm === null && intervalKm) {
      const c = await getVehicleCounters(geliosUnitId);
      lastServiceKm = c.mileageKm;
    }

    const item = await prisma.maintenanceItem.create({
      data: { geliosUnitId, vehicleName, type, intervalKm, intervalDays, lastServiceKm, lastServiceAt, notes },
    });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la creare";
    console.error("maintenance POST", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
