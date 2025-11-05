import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get the session from the request headers
    const authHeader = request.headers.get('authorization');
    
    return NextResponse.json({
      status: "OK",
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET",
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET",
        nodeEnv: process.env.NODE_ENV,
      },
      authHeader: authHeader ? "Present" : "Not present",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug auth error:", error);
    return NextResponse.json(
      { status: "ERROR", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("Debug login attempt for:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return NextResponse.json({
      success: !error,
      error: error?.message,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        lastSignIn: data.user.last_sign_in_at
      } : null,
      session: data.session ? {
        accessToken: data.session.access_token ? "Present" : "Missing",
        refreshToken: data.session.refresh_token ? "Present" : "Missing",
        expiresAt: data.session.expires_at
      } : null
    });
  } catch (error) {
    console.error("Debug login error:", error);
    return NextResponse.json(
      { status: "ERROR", error: String(error) },
      { status: 500 }
    );
  }
}