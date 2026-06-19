import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ── Known carrier subdomains ────────────────────────────────────────────────
// Each slug maps to organizations.organization_slug in the DB.
// Add new carriers here when they are onboarded and paid.
const CARRIER_SLUGS = new Set(["ronyx", "solis", "garcia", "ymrleah", "jjalvarado"]);

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Content-Security-Policy", "upgrade-insecure-requests");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return res;
}

function extractSubdomain(host: string): string | null {
  const withoutPort = host.split(":")[0];
  const parts = withoutPort.split(".");
  // Need at least 3 parts for a subdomain (e.g. solis.movearoundtms.app)
  // localhost:3000 → 1 part → null (dev default)
  if (parts.length < 3) return null;
  return parts[0].toLowerCase();
}

export async function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const host = req.headers.get("host") || "";
    const pathname = url.pathname;

    const isPublicAsset =
      pathname === "/manifest.json" ||
      pathname === "/sw.js" ||
      pathname === "/service-worker.js" ||
      pathname === "/offline.html" ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico";

    if (isPublicAsset) return NextResponse.next();

    // Strip www.ronyx.* → ronyx.*
    if (host.startsWith("www.ronyx.")) {
      const canonicalHost = host.replace("www.ronyx.", "ronyx.");
      return NextResponse.redirect(`https://${canonicalHost}${pathname}`, 301);
    }

    const subdomain = extractSubdomain(host);

    // ── Platform admin subdomain ────────────────────────────────────────────
    if (subdomain === "admin") {
      if (!pathname.startsWith("/admin") && !isPublicAsset) {
        url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
        const res = NextResponse.rewrite(url);
        res.headers.set("x-is-platform-admin", "true");
        return applySecurityHeaders(res);
      }
      return applySecurityHeaders(NextResponse.next());
    }

    // ── Known carrier subdomains ────────────────────────────────────────────
    if (subdomain && CARRIER_SLUGS.has(subdomain)) {
      // Already on the correct /ronyx/* path — just inject org context header
      if (pathname.startsWith("/ronyx")) {
        const res = NextResponse.next();
        res.headers.set("x-org-slug", subdomain);
        return applySecurityHeaders(res);
      }
      // Rewrite bare "/" or any other path to /ronyx/...
      url.pathname = `/ronyx${pathname === "/" ? "" : pathname}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("x-org-slug", subdomain);
      return applySecurityHeaders(res);
    }

    // ── No recognized subdomain (bare domain, localhost, etc.) ─────────────
    // On bare domain — if visiting /ronyx/... paths, inject ronyx as default
    if (pathname.startsWith("/ronyx") || pathname === "/") {
      const res = NextResponse.next();
      res.headers.set("x-org-slug", "ronyx");
      return applySecurityHeaders(res);
    }

    return applySecurityHeaders(NextResponse.next());
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api).*)",
  ],
};
