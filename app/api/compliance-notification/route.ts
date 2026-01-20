import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// POST: Trigger notification for a compliance alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_type, truck_number, dvir_id, message, recipient_email } =
      body;
    if (!alert_type || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    // Insert notification into queue
    const { data, error } = await supabaseAdmin
      .from("compliance_notifications")
      .insert([
        {
          alert_type,
          truck_number,
          dvir_id,
          message,
          recipient_email,
        },
      ])
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    let email = {
      sent: false,
      reason: "recipient_email not provided",
    };
    if (recipient_email) {
      const subject = `Compliance Alert: ${alert_type}`;
      const text = [
        `Alert: ${alert_type}`,
        `Message: ${message}`,
        truck_number ? `Truck: ${truck_number}` : null,
        dvir_id ? `DVIR: ${dvir_id}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const html = [
        `<p><strong>Alert:</strong> ${alert_type}</p>`,
        `<p><strong>Message:</strong> ${message}</p>`,
        truck_number ? `<p><strong>Truck:</strong> ${truck_number}</p>` : null,
        dvir_id ? `<p><strong>DVIR:</strong> ${dvir_id}</p>` : null,
      ]
        .filter(Boolean)
        .join("");

      const { data: emailData, error: emailError } =
        await supabaseAdmin.functions.invoke("send-email", {
          body: {
            to: recipient_email,
            subject,
            text,
            html,
          },
        });

      if (emailError) {
        return NextResponse.json(
          {
            success: false,
            notification: data,
            email: { sent: false, error: emailError.message },
          },
          { status: 502 },
        );
      }

      email = { sent: true, response: emailData ?? null };
    }

    return NextResponse.json({ success: true, notification: data, email });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
