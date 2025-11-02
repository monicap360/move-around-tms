import { createClient } from '@supabase/supabase-js'

// Server-side Supabase admin client. Use this only in server-only code (API
// routes, server components). Keep SUPABASE_SERVICE_KEY secret and never
// expose it to client code.

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Supabase admin client is missing required env vars. Set SUPABASE_SERVICE_KEY and SUPABASE_URL in your server environment.'
  )
}

export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '')

export default supabaseAdmin
