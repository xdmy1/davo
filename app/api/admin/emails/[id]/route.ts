import { NextResponse } from "next/server";
import { sendSingleJob } from "@/lib/emailQueue";

export const dynamic = "force-dynamic";

// Retrimite/forțează un singur email (inclusiv cele eșuate).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await sendSingleJob(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin/emails/[id] retry", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
