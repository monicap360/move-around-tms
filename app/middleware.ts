import { NextResponse } from 'next/server'// Edge-compatible middleware that avoids importing `next/server` so

import type { NextRequest } from 'next/server'// Vercel Edge Functions won't reject the bundle during deployment.

//

export function middleware(request: NextRequest) {// This middleware uses a conservative cookie-presence heuristic to

  const { pathname } = request.nextUrl// approximate authentication state for routing/redirects. For secure

// validation, perform server-side checks in API routes or server

  // 🚨 INTERCEPT ALL LOGIN ATTEMPTS - FORCE DASHBOARD ACCESS// components instead.

  if (pathname.includes('login') || 

      pathname.includes('auth') || export async function middleware(request: Request) {

      pathname.includes('signin') ||   // 🚀 AUTHENTICATION COMPLETELY DISABLED - ALLOW ALL ACCESS 🚀

      pathname.includes('sign-in') ||  // This middleware has been disabled to allow immediate access to all routes

      pathname.includes('signup') ||  // No authentication checks, no redirects to login page

      pathname.includes('sign-up') ||  

      pathname.includes('reset-password')) {  console.log('🚀 Middleware: Authentication bypassed for:', request.url);

      

    console.log('🚨 MIDDLEWARE: Intercepted auth attempt:', pathname)  // Allow ALL requests to pass through without any checks

      return undefined; // continue to requested page without any restrictions

    // Force redirect to dashboard}

    const dashboardUrl = new URL('/dashboard', request.url)

    dashboardUrl.searchParams.set('auth_removed', 'true')export const config = {

    dashboardUrl.searchParams.set('timestamp', Date.now().toString())  matcher: [

        "/((?!api|_next/static|_next/image|favicon.ico|assets|public|sw.js|manifest.json).*)",

    return NextResponse.redirect(dashboardUrl, 301)  ],

  }};

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|dashboard|test-direct-access).*)',
  ]
}