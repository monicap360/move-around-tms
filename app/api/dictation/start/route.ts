import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: Start dictation session
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Create dictation session
    const { data: session, error } = await supabase
      .from("dictation_sessions")
      .insert({
        dispatcher_id: user.id,
        organization_id: organizationId,
        reviewed: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating dictation session:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from("dictation_audit_log").insert({
      dispatcher_id: user.id,
      organization_id: organizationId,
      action: "dictation_started",
      session_id: session.id,
      metadata: {},
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error("Error in dictation/start:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
