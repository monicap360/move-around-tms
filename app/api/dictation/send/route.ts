import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: Send dictated message to driver
// Messages are delivered as TEXT or SYSTEM VOICE, NOT live dispatcher voice
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
    const { sessionId, driverId, loadId, deliveryMethod = "text" } = body;

    if (!sessionId || !driverId) {
      return NextResponse.json(
        { error: "sessionId and driverId are required" },
        { status: 400 }
      );
    }

    // Validate delivery method
    if (!["text", "system_voice", "both"].includes(deliveryMethod)) {
      return NextResponse.json(
        { error: "Invalid delivery method" },
        { status: 400 }
      );
    }

    // Get session
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

    // Get final message text (edited or original)
    const messageText = session.edited_text || session.transcribed_text || "";
    
    if (!messageText.trim()) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }

    // Validate message length
    if (messageText.length > 500) {
      return NextResponse.json(
        { error: "Message exceeds maximum length of 500 characters" },
        { status: 400 }
      );
    }

    // TODO: Verify dispatcher has permission to message this driver
    // TODO: Verify driver has active load (if loadId provided)
    
    // Create dictated message record
    const { data: message, error: messageError } = await supabase
      .from("dictated_messages")
      .insert({
        session_id: sessionId,
        dispatcher_id: user.id,
        organization_id: session.organization_id,
        driver_id: driverId,
        load_id: loadId || null,
        message_text: messageText,
        original_transcription: session.transcribed_text,
        message_length: messageText.length,
        delivery_method: deliveryMethod,
        system_voice_enabled: deliveryMethod === "system_voice" || deliveryMethod === "both",
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    // Create delivery record
    await supabase.rpc("create_message_delivery", {
      p_message_id: message.id,
      p_driver_id: driverId,
      p_delivery_method: deliveryMethod,
    });

    // TODO: Deliver message to driver
    // - If text: Send to existing messaging system
    // - If system_voice: Generate synthetic voice audio and deliver
    // - If both: Do both
    
    // For now, integrate with existing dispatch_messages table if it exists
    // Or create notification/push notification
    
    // Log audit event
    await supabase.from("dictation_audit_log").insert({
      dispatcher_id: user.id,
      organization_id: session.organization_id,
      action: "message_sent",
      session_id: sessionId,
      message_id: message.id,
      driver_id: driverId,
      transcribed_text: messageText,
      metadata: { deliveryMethod, loadId },
    });

    return NextResponse.json({
      messageId: message.id,
      status: "sent",
      deliveredAt: message.sent_at,
    });
  } catch (err: any) {
    console.error("Error in dictation/send:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
