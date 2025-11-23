// lib/supabaseClient.ts
// Client-side Supabase instance for browser-side usage.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// lib/supabaseClient.ts
// Client-side Supabase instance for browser-side usage.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
<<<<<<< HEAD
// DEPRECATED: Use useSupabase() hook from supabase-provider instead
// This file is kept for backward compatibility but should be migrated

// lib/supabaseClient.ts
// Client-side Supabase instance for browser components.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
=======
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
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
