import { NextRequest, NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/emailQueue";

export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured on server" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await processEmailQueue();
    return NextResponse.json({ success: true, ...results, at: new Date().toISOString() });
  } catch (error) {
    console.error("cron/send-reminders", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
