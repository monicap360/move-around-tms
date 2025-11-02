import { createClient } from '@supabase/supabase-js'

// Simple public Supabase client for client-side pages.
// Uses the NEXT_PUBLIC keys from your environment. For server-side
// privileged operations use a service role key from server-only code.

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLIC_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Light runtime validation to surface misconfig early in the browser/devtools.
// We avoid throwing on import in case some pages don't need Supabase.
if (typeof window !== 'undefined') {
  if (!PUBLIC_URL || !/^https?:\/\//.test(PUBLIC_URL)) {
    // eslint-disable-next-line no-console
    console.error('Supabase client: NEXT_PUBLIC_SUPABASE_URL is missing or invalid. Set it to your project URL (https://xxxx.supabase.co).')
  }
  if (!PUBLIC_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.error('Supabase client: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Set it to your project anon key.')
  }
}

export const supabase = createClient(
  PUBLIC_URL || '',
  PUBLIC_ANON_KEY || ''
)
