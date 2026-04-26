import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    // API: 401 JSON
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    // Pagini admin: redirect la /login?next=<path>
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
