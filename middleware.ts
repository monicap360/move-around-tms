// Unified Edge-compatible middleware for both API protection and page routing
// This handles both authentication routing and API token validation

const publicAllowList = [
  '/api/merch/create-checkout',
  '/api/env/health',
  '/api/health/auth',
  '/api/webhooks/supabase-auth',
  '/api/webhooks/sms', // Allow Twilio SMS webhook
]

export function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Handle API routes - API protection logic
  if (pathname.startsWith('/api')) {
    // Allow explicitly public API endpoints
    if (publicAllowList.includes(pathname)) return undefined // continue

    // Protect API routes with bearer token
    const authHeader = request.headers.get('authorization') || ''
    const expected = process.env.ADMIN_TOKEN

    if (!expected) {
      console.warn('ADMIN_TOKEN not set  middleware will block protected API routes until you set it in .env.local')
    }

    if (authHeader !== `Bearer ${expected}`) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }), 
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return undefined // continue
  }

  // Handle page routes - Authentication routing logic
  // Allow static assets and auth callback to load freely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/auth/callback")
  ) {
    return undefined // continue
  }

  const cookieHeader = request.headers.get("cookie") || ""

  const cookieNamesToCheck = [
    "supabase-auth-token",
    "sb-access-token", 
    "sb-refresh-token",
    "sb:token",
    "sb-session",
  ]

  const hasAuthCookie = cookieNamesToCheck.some((name) =>
    cookieHeader.includes(name + "=")
  )

  // Allow homepage (/) for everyone - no auth required
  if (pathname === "/") {
    return undefined // continue
  }

  // If not logged in and trying to access a protected route, redirect to login
  if (!hasAuthCookie && pathname !== "/login") {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirectedFrom", pathname)
    return Response.redirect(redirectUrl.toString())
  }

  // If logged in and trying to access /login, send to dashboard
  if (hasAuthCookie && pathname === "/login") {
    return Response.redirect(new URL("/dashboard", request.url).toString())
  }

  return undefined
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|public|sw.js|manifest.json).*)",
  ],
}
