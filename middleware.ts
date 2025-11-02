import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware to protect admin API routes with a simple bearer token.
// Applies to paths matching /api/:path* (see config below). Adjust the
// `publicAllowList` to exempt endpoints that should remain public (webhooks,
// payment checkout creation, etc.).

const publicAllowList = [
  '/api/merch/create-checkout',
  '/api/env/health',
  '/api/health/auth',
  '/api/webhooks/supabase-auth',
  '/api/webhooks/sms', // Allow Twilio SMS webhook
]

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Allow explicitly public API endpoints
  if (publicAllowList.includes(pathname)) return NextResponse.next()

  // Only protect API routes (config matcher already limits middleware to /api)
  const authHeader = req.headers.get('authorization') || ''
  const expected = process.env.ADMIN_TOKEN

  if (!expected) {
    // If ADMIN_TOKEN is not set, block by default and help the developer notice.
    console.warn('ADMIN_TOKEN not set — middleware will block protected API routes until you set it in .env.local')
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
