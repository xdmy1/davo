import { NextResponse } from "next/server";
import { retryFailedJobs } from "@/lib/emailQueue";

export const dynamic = "force-dynamic";

// Reîncearcă toate emailurile eșuate: reset la queued + rulează coada.
export async function POST() {
  try {
    const results = await retryFailedJobs();
    return NextResponse.json({ success: true, ...results, at: new Date().toISOString() });
  } catch (error) {
    console.error("admin/emails/retry-failed", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
