import { NextResponse } from 'next/server'

// GET /api/env/health
// Returns presence (true/false) for required environment variables.
// Does NOT return actual secret values.
export async function GET() {
  const presence = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS: Boolean(process.env.NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
    ADMIN_TOKEN: Boolean(process.env.ADMIN_TOKEN),
    SUPABASE_WEBHOOK_SECRET: Boolean(process.env.SUPABASE_WEBHOOK_SECRET),
  }

  return NextResponse.json({ ok: true, env: presence })
}
