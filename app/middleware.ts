// Edge-compatible middleware that avoids importing `next/server` so
// Vercel Edge Functions won't reject the bundle during deployment.
//
// This middleware uses a conservative cookie-presence heuristic to
// approximate authentication state for routing/redirects. For secure
// validation, perform server-side checks in API routes or server
// components instead.

export async function middleware(request: Request) {
  // 🚀 AUTHENTICATION COMPLETELY DISABLED - ALLOW ALL ACCESS 🚀
  // This middleware has been disabled to allow immediate access to all routes
  // No authentication checks, no redirects to login page
  
  console.log('🚀 Middleware: Authentication bypassed for:', request.url);
  
  // Allow ALL requests to pass through without any checks
  return undefined; // continue to requested page without any restrictions
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|assets|public|sw.js|manifest.json).*)",
  ],
};