// DEPRECATED: Use useSupabase() hook from supabase-provider instead
// This file is kept for backward compatibility but should be migrated

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.\n' +
    'Set these in your .env.local (local dev) or in your hosting provider secrets (production).'
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)