import { supabase } from '../../lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("Testing login for email:", email);
    
    // Test the credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error("Credential test failed:", error.message);
      return NextResponse.json({
        success: false,
        error: error.message,
        errorCode: error.status,
        suggestion: error.message.includes("Invalid login credentials") 
          ? "User doesn't exist or password is wrong"
          : "Check Supabase configuration"
      });
    }
    
    // Sign out immediately after test
    await supabase.auth.signOut();
    
    return NextResponse.json({
      success: true,
      message: "Credentials are valid",
      userEmail: data.user?.email,
      userId: data.user?.id
    });
    
  } catch (err) {
    console.error("Credential test error:", err);
    return NextResponse.json({
      success: false,
      error: "Server error during credential test"
    }, { status: 500 });
  }
}