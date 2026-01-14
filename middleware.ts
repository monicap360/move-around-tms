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

    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const hostname = req.headers.get("host") || "";

    // Skip middleware for:
    // - API routes
    // - Static assets
    // - Ronyx subdomain and routes
    // - Billing routes
    // - Public routes
    // - Health check routes
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/billing") ||
      pathname.startsWith("/ronyx") ||
      pathname.startsWith("/veronica") ||
      pathname.startsWith("/ronyx-login") ||
      hostname.includes("ronyx") ||
      hostname.includes("movearoundms") ||
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth") ||
      pathname === "/health" ||
      pathname === "/api/health"
    ) {
      return res;
    }

    // Only enforce payment checks for main app (not Ronyx)
    // Skip if Supabase env vars are missing (prevents 502 errors)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("Supabase env vars missing, skipping payment check");
      return res;
    }

    try {
      // Get Supabase session from cookies
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      
      const access_token = req.cookies.get("sb-access-token")?.value;
      if (!access_token) {
        url.pathname = "/billing/setup";
        return NextResponse.redirect(url);
      }
      
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(access_token);
      
      if (authError || !user) {
        url.pathname = "/billing/setup";
        return NextResponse.redirect(url);
      }
      
      // Check for active payment (only if payments table exists)
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);
      
      // If payments table doesn't exist or no active payment, allow access
      // (This prevents blocking when payments table isn't set up)
      if (paymentError || !payments || payments.length === 0) {
        // Allow access - payment enforcement can be enabled later
        return res;
      }
      
      return res;
    } catch (error) {
      // On any error, allow the request through to prevent 502s
      console.error("Middleware error:", error);
      const errorRes = NextResponse.next();
      errorRes.headers.set("X-Frame-Options", "SAMEORIGIN");
      errorRes.headers.set("X-Content-Type-Options", "nosniff");
      return errorRes;
    }
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
