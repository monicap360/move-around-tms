import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// This endpoint checks for unsent compliance notifications and sends emails via Supabase Edge Functions.
export async function POST() {
  // Fetch unsent notifications
  const { data: notifications, error } = await supabaseAdmin
    .from("compliance_notifications")
    .select("*")
    .eq("sent", false)
    .limit(10);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications || notifications.length === 0)
    return NextResponse.json({ ok: true, message: "No unsent notifications." });

  let sentCount = 0;
  for (const n of notifications) {
    if (!n.recipient_email) continue;
    // Compose email
    const subject = `Compliance Alert: ${n.alert_type.replace(/_/g, " ").toUpperCase()}`;
    const text = n.message;
    const html = `<p>${n.message}</p>`;
    const { error: emailError } = await supabaseAdmin.functions.invoke(
      "send-email",
      {
        body: {
          to: n.recipient_email,
          subject,
          text,
          html,
        },
      },
    );

    if (!emailError) {
      // Mark as sent
      await supabaseAdmin
        .from("compliance_notifications")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", n.id);
      sentCount++;
    }
  }
  return NextResponse.json({ ok: true, sent: sentCount });
}
