import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// List of routes that do NOT require authentication
const PUBLIC_ROUTES = ["/login", "/signup", "/reset-password", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Check for Supabase session cookie
  const supabaseSession = request.cookies.get("sb-access-token")?.value;

  // If not logged in, redirect to /login
  if (!supabaseSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and accessing /login, redirect to /dashboard
  if (pathname === "/login" && supabaseSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // Otherwise, allow
  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"]
};