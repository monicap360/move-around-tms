import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, boolean> = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    ADMIN_TOKEN: !!process.env.ADMIN_TOKEN,
    SUPABASE_WEBHOOK_SECRET: !!process.env.SUPABASE_WEBHOOK_SECRET,
    NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS: !!process.env.NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  }

  const allPresent = Object.values(checks).every((v) => v)
  const missing = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  return NextResponse.json({
    ok: allPresent,
    checks,
    missing,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  })
}
