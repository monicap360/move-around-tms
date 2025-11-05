import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTE
// Vercel Edge runtime does not support server-only modules such as
// `@supabase/ssr`. The previous middleware used createServerClient which
// pulled in server-only code and caused the build to fail on Vercel.
//
// To keep the middleware Edge-compatible we use a simple cookie-based
// heuristic to detect whether a user is likely authenticated. This is
// intentionally conservative: presence of a known Supabase auth cookie
// indicates the user may be signed in. For robust session validation
// move auth checks to server-side API routes or server components.

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;

  // Allow login page and static assets to load freely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/auth/callback")
  ) {
    return response;
  }

  // Heuristic: check for common Supabase auth cookie names. If any exist,
  // treat user as authenticated for routing purposes.
  const cookieNamesToCheck = [
    "supabase-auth-token",
    "sb-access-token",
    "sb-refresh-token",
    "sb:token",
    "sb-session",
  ];

  let hasAuthCookie = false;
  for (const name of cookieNamesToCheck) {
    const c = request.cookies.get(name);
    if (c && c.value) {
      hasAuthCookie = true;
      break;
    }
  }

  // If not logged in and trying to access a protected route, redirect to login
  if (!hasAuthCookie && pathname !== "/login") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If logged in and trying to access /login, send to dashboard
  if (hasAuthCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If logged in and accessing root, redirect to dashboard
  if (hasAuthCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - assets (asset files)
    // - public (public files)
    "/((?!api|_next/static|_next/image|favicon.ico|assets|public|sw.js|manifest.json).*)",
  ],
};