import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/session";

// Paths that are auth-protected. We run the auth check first; if it
// short-circuits, we never touch locale routing.
const isAdminPath = (p: string) => p.startsWith("/admin") || p.startsWith("/api/admin");

// Paths that must NOT receive a locale rewrite (admin, API, static, login, ticket PDF, etc.).
function shouldSkipLocale(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/robots") ||
    // Any file with an extension (images, etc.)
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ===== Admin auth (unchanged behavior for /admin, /api/admin) =====
  if (isAdminPath(pathname)) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      if (pathname.startsWith("/api/admin/")) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // ===== Locale routing =====
  if (shouldSkipLocale(pathname)) {
    return NextResponse.next();
  }

  // /ru and /ru/* are explicit Russian routes; let Next.js route them
  // directly to [lang]=ru pages.
  if (pathname === "/ru" || pathname.startsWith("/ru/")) {
    return NextResponse.next();
  }

  // Everything else is Romanian. Internally rewrite to /ro/<path> so the
  // [lang] segment resolves to "ro" while the visible URL stays clean.
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/ro" : `/ro${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Match everything except Next.js internals and static assets.
  // We do the finer-grained skipping inside the handler so we can still
  // intercept arbitrary public paths.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|images/|videos/).*)",
  ],
};
