
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 🚀 Middleware disabled — all routes allowed.
// This ensures no authentication checks and no login interception.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Optional simple security headers (safe + recommended)
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

// Middleware applies to all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api).*)"
  ],
};
