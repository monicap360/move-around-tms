// Edge-compatible middleware that avoids importing `next/server` so
// Vercel Edge Functions won't reject the bundle during deployment.
//
// This middleware uses a conservative cookie-presence heuristic to
// approximate authentication state for routing/redirects. For secure
// validation, perform server-side checks in API routes or server
// components instead.

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow login page and static assets to load freely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/auth/callback")
  ) {
    return undefined; // continue
  }

  const cookieHeader = request.headers.get("cookie") || "";

  const cookieNamesToCheck = [
    "supabase-auth-token",
    "sb-access-token",
    "sb-refresh-token",
    "sb:token",
    "sb-session",
  ];

  const hasAuthCookie = cookieNamesToCheck.some((name) =>
    cookieHeader.includes(name + "=")
  );

  // Allow homepage (/) for everyone - no auth required
  if (pathname === "/") {
    return undefined; // continue
  }

  // If not logged in and trying to access a protected route, redirect to login
  if (!hasAuthCookie && pathname !== "/login") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return Response.redirect(redirectUrl.toString());
  }

  // If logged in and trying to access /login, send to dashboard
  if (hasAuthCookie && pathname === "/login") {
    return Response.redirect(new URL("/dashboard", request.url).toString());
  }

  return undefined;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|assets|public|sw.js|manifest.json).*)",
  ],
};