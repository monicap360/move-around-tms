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

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, organization_id, phone")
      .eq("id", driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 },
      );
    }

    if (
      driver.organization_id &&
      driver.organization_id !== session.organization_id
    ) {
      return NextResponse.json(
        { error: "Driver does not belong to your organization" },
        { status: 403 },
      );
    }

    if (loadId) {
      const { data: load, error: loadError } = await supabase
        .from("loads")
        .select("id, driver_id, organization_id, status")
        .eq("id", loadId)
        .single();

      if (loadError || !load) {
        return NextResponse.json(
          { error: "Load not found" },
          { status: 404 },
        );
      }

      if (load.organization_id && load.organization_id !== session.organization_id) {
        return NextResponse.json(
          { error: "Load does not belong to your organization" },
          { status: 403 },
        );
      }

      if (load.driver_id && load.driver_id !== driverId) {
        return NextResponse.json(
          { error: "Load is not assigned to this driver" },
          { status: 400 },
        );
      }
    }
    
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

    const deliveries: Array<{ method: string; status: string; detail?: string }> = [];
    const origin = request.nextUrl.origin;

    if (deliveryMethod === "text" || deliveryMethod === "both") {
      if (!driver.phone) {
        deliveries.push({ method: "text", status: "skipped", detail: "Missing driver phone" });
      } else {
        const smsRes = await fetch(`${origin}/api/sms/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: driver.phone, message: messageText }),
        });

        deliveries.push({
          method: "text",
          status: smsRes.ok ? "sent" : "failed",
          detail: smsRes.ok ? undefined : await smsRes.text(),
        });
      }
    }

    if (deliveryMethod === "system_voice" || deliveryMethod === "both") {
      // Voice delivery is logged for downstream TTS/driver app consumption.
      deliveries.push({ method: "system_voice", status: "queued" });
    }
    
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
      deliveries,
    });
  } catch (err: any) {
    console.error("Error in dictation/send:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
