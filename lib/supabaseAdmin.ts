// lib/supabaseAdmin.ts
// Server-only Supabase client with service role key.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
import { createClient } from '@supabase/supabase-js'

<<<<<<< HEAD
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable')
}

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default supabaseAdmin
export { supabaseAdmin }
=======
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
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
