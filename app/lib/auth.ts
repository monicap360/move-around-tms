// DEPRECATED: Use useSupabase() hook from supabase-provider instead
// This file is kept for backward compatibility but should be migrated

import { createBrowserClient } from "@supabase/ssr";

// Load your Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize the Supabase client using modern SSR approach
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Sign in with OTP (email link)
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
}

// Sign in with email and password
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Sign in with third-party providers (Google, Facebook, etc.)
export async function signInWithProvider(provider: "google" | "facebook" | "github") {
  // Use appropriate URL based on environment
  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : process.env.NODE_ENV === 'production'
    ? 'https://app.movearoundtms.com/auth/callback'
    : 'http://localhost:3000/auth/callback';
    
  const { data, error } = await supabase.auth.signInWithOAuth({ 
    provider,
    options: {
      redirectTo: redirectUrl,
    },
  });
  if (error) throw error;
  return data;
}

// Retrieve the current session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Sign out the current user
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = '/login';
}