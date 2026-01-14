import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 🚀 Subscription enforcement middleware (disabled for Ronyx subdomain)
export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    // Security headers
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Subscription and login enforcement removed: allow all requests.
    return res;
  } catch (globalError) {
    // Ultimate fallback - return a basic response
    const fallbackRes = NextResponse.next();
    fallbackRes.headers.set("X-Frame-Options", "SAMEORIGIN");
    return fallbackRes;
  }
}

// Middleware applies to all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api).*)",
  ],
};
