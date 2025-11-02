import type { NextRequest } from 'next/server'

export function isSameOrigin(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || ''
    const referer = req.headers.get('referer') || ''
    const requestOrigin = new URL(req.url).origin
    const allowed = process.env.NEXT_PUBLIC_BASE_URL || ''

    // Prefer Origin header; fallback to Referer
    const headerOrigin = origin || (referer ? new URL(referer).origin : '')

    if (!headerOrigin) return false

    // Allow if matches current request origin
    if (headerOrigin === requestOrigin) return true

    // Allow if matches explicitly configured base URL
    if (allowed && headerOrigin === allowed) return true

    return false
  } catch {
    return false
  }
}

export function requireSameOrigin(req: NextRequest) {
  return isSameOrigin(req)
}
