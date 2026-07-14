import { NextResponse } from "next/server";
import { getFleet } from "@/lib/gelios";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { vehicles, summary } = await getFleet();
    return NextResponse.json({ success: true, vehicles, summary, fetchedAt: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gelios error";
    console.error("admin/vehicles GET", error);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
