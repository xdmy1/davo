import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccessAPI, canAccessUI, homePathForRole, normalizeRole } from "@/lib/permissions";

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
  const { pathname } = req.nextUrl;

  // ===== Admin auth + role-based access =====
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

    // Role-based gate: încărcăm rolul din DB (token-ul stochează doar email).
    // Userii rolă necunoscută devin "admin" — back-compat cu seed-ul vechi.
    const user = await prisma.adminUser.findUnique({
      where: { email: session.email },
      select: { role: true, active: true, permissions: true },
    });

    // Cookie-ul e semnat pe o săptămână, deci dezactivarea (sau ștergerea)
    // contului din „Conturi & Acces” nu are niciun efect dacă nu o verificăm
    // aici — sesiunea deja emisă ar rămâne validă până la expirare.
    if (!user || !user.active) {
      const res = pathname.startsWith("/api/admin/")
        ? NextResponse.json({ success: false, error: "Cont dezactivat" }, { status: 401 })
        : NextResponse.redirect(new URL("/login?inactiv=1", req.url));
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    const role = normalizeRole(user.role);
    const permissions = user.permissions;

    if (pathname.startsWith("/api/admin/")) {
      // Metoda contează: dependențele de lookup din catalog sunt permise doar
      // pe citire (vezi `apiDeps` în lib/permissions.ts).
      if (!canAccessAPI(role, pathname, permissions, req.method)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (!canAccessUI(role, pathname, permissions)) {
        // Trimite-l acasă (la prima pagină permisă) ca să nu se învârtă în
        // 403-loops. Pentru admin2 e /admin/bookings.
        const url = new URL(homePathForRole(role, permissions), req.url);
        return NextResponse.redirect(url);
      }
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
