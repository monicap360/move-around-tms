import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if environment variables are set
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY;

    return NextResponse.json({
      status: 'OK',
      environment: {
        supabaseUrl: hasSupabaseUrl,
        anonKey: hasAnonKey,
        serviceKey: hasServiceKey,
        supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed', details: error },
      { status: 500 }
    );
  }
}