import { NextRequest, NextResponse } from "next/server";
import { createToken, COOKIE_NAME, cookieOptions } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    const envEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD ?? "";

    if (!envEmail || !envPassword) {
      return NextResponse.json(
        { success: false, error: "ADMIN_EMAIL / ADMIN_PASSWORD nu sunt configurate" },
        { status: 500 }
      );
    }
    if (!process.env.SESSION_SECRET) {
      return NextResponse.json(
        { success: false, error: "SESSION_SECRET nu e configurat" },
        { status: 500 }
      );
    }

    if (email !== envEmail || password !== envPassword) {
      return NextResponse.json(
        { success: false, error: "Email sau parolă incorecte" },
        { status: 401 }
      );
    }

    const token = await createToken(email);
    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, token, cookieOptions());
    return res;
  } catch (error) {
    console.error("auth/login", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
