import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: Transcribe speech to text
// In production, this would use a cloud STT service (Google, AWS, Azure)
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

    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const audioFile = formData.get("audio") as File | null;

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

    // TODO: In production, send audioFile to cloud STT service
    // For now, return placeholder (frontend should handle STT client-side or via cloud)
    // This endpoint is a placeholder for server-side STT processing
    
    // Example: If using client-side Web Speech API, this endpoint might not be needed
    // But if using cloud STT, process audioFile here
    
    let transcribedText = "";
    let confidence = 0.85;

    // Placeholder: In production, replace with actual STT service call
    // const transcribedText = await transcribeAudioWithCloudService(audioFile);
    
    // Update session with transcription
    const { data: updatedSession, error: updateError } = await supabase
      .from("dictation_sessions")
      .update({
        transcribed_text: transcribedText,
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
      action: "dictation_completed",
      session_id: sessionId,
      transcribed_text: transcribedText,
      metadata: { confidence },
    });

    return NextResponse.json({
      sessionId,
      transcribedText,
      confidence,
    });
  } catch (err: any) {
    console.error("Error in dictation/transcribe:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
