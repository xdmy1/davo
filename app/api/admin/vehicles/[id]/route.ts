import { NextRequest, NextResponse } from "next/server";
import { getVehicleDetail } from "@/lib/gelios";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ success: false, error: "id invalid" }, { status: 400 });
    }
    const vehicle = await getVehicleDetail(numId);
    if (!vehicle) {
      return NextResponse.json({ success: false, error: "Vehicul inexistent" }, { status: 404 });
    }
    return NextResponse.json({ success: true, vehicle, fetchedAt: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gelios error";
    console.error("admin/vehicles/[id] GET", error);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
