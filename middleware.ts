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

    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return res;
    }

    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const hostname = req.headers.get("host") || "";

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

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.warn("Supabase env vars missing, skipping payment check");
      return res;
    }

    try {
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

      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      if (paymentError || !payments || payments.length === 0) {
        return res;
      }

      return res;
    } catch (error) {
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
