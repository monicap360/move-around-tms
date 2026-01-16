import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 🚀 Lightweight middleware - Security headers only, no payment/auth blocking
export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    
    // Security headers
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return res;
  } catch (error) {
    // Fallback - allow all traffic
    return NextResponse.next();
  }
}

// Middleware applies to all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api).*)",
  ],
};
