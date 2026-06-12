import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Force all subresource requests to HTTPS, eliminating mixed-content warnings
  res.headers.set("Content-Security-Policy", "upgrade-insecure-requests");
  // Tell browsers to only use HTTPS for this domain for 1 year
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return res;
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

    // Redirect www.ronyx.* → ronyx.* (www on a subdomain is invalid for SSL)
    if (host.startsWith("www.ronyx.")) {
      const canonicalHost = host.replace("www.ronyx.", "ronyx.");
      return NextResponse.redirect(`https://${canonicalHost}${pathname}`, 301);
    }

    // Route subdomain traffic to the Ronyx dashboard paths
    if (host.startsWith("ronyx.") && !pathname.startsWith("/ronyx") && !isPublicAsset) {
      url.pathname = `/ronyx${pathname === "/" ? "" : pathname}`;
      return applySecurityHeaders(NextResponse.rewrite(url));
    }

    return applySecurityHeaders(NextResponse.next());
  } catch {
    return NextResponse.next();
  }
}

// Middleware applies to all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api).*)",
  ],
};
