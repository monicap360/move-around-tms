import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: Review and update transcribed text
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
    const { sessionId, editedText } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from("dictation_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("dispatcher_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Validate message length (max 500 characters)
    const textToSave = editedText || session.transcribed_text || "";
    if (textToSave.length > 500) {
      return NextResponse.json(
        { error: "Message exceeds maximum length of 500 characters" },
        { status: 400 }
      );
    }

    // Update session with reviewed text
    const { data: updatedSession, error: updateError } = await supabase
      .from("dictation_sessions")
      .update({
        edited_text: textToSave,
        reviewed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating session:", updateError);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from("dictation_audit_log").insert({
      dispatcher_id: user.id,
      organization_id: session.organization_id,
      action: "message_reviewed",
      session_id: sessionId,
      transcribed_text: textToSave,
      metadata: {},
    });

    return NextResponse.json({
      sessionId,
      reviewedText: textToSave,
      reviewed: true,
    });
  } catch (err: any) {
    console.error("Error in dictation/review:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
