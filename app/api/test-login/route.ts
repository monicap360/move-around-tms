import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("Testing login for:", email);
    
    // Test the login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return NextResponse.json({
      success: !error,
      error: error?.message || null,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: data.user.email_confirmed_at !== null,
        lastSignIn: data.user.last_sign_in_at,
        createdAt: data.user.created_at
      } : null,
      session: data.session ? {
        hasAccessToken: !!data.session.access_token,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type
      } : null,
      authUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Test login error:", err);
    return NextResponse.json(
      { 
        success: false, 
        error: "Server error: " + (err instanceof Error ? err.message : String(err))
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint with { email, password } to test login",
    supabaseConfigured: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  });
}