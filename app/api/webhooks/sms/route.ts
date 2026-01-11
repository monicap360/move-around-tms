import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Twilio sends SMS webhook data as form-encoded
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const from = formData.get("From") as string; // Driver's phone number
    const mediaUrl = formData.get("MediaUrl0") as string; // Photo URL
    const numMedia = parseInt((formData.get("NumMedia") as string) || "0");

    console.log("Received SMS from:", from, "with", numMedia, "media files");

    if (numMedia === 0 || !mediaUrl) {
      // No image attached
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ Please attach a photo of your delivery ticket.</Message>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Calculate current pay week (Friday-anchored)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceFriday = (dayOfWeek + 2) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysSinceFriday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const isInPayWeek = today >= weekStart && today <= weekEnd;

    if (!isInPayWeek) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ You can only upload tickets during the current pay week (Friday-Thursday).</Message>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Find driver by phone number
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("id, name")
      .eq("phone", from)
      .single();

    if (driverErr || !driver) {
      console.error("Driver not found:", from);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ Phone number not registered. Contact your manager to add your number.</Message>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Download image from Twilio
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
        ).toString("base64")}`,
      },
    });

    if (!mediaResponse.ok) {
      throw new Error("Failed to download media from Twilio");
    }

    const imageBuffer = await mediaResponse.arrayBuffer();
    const fileName = `sms-${driver.id}-${Date.now()}.jpg`;
    const path = `tickets/${weekStart.toISOString().split("T")[0]}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadRes, error: uploadErr } = await supabase.storage
      .from("hr_docs")
      .upload(path, imageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ Failed to upload image. Please try again.</Message>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Create signed URL for OCR
    const { data: signed } = await supabase.storage
      .from("hr_docs")
      .createSignedUrl(uploadRes.path, 60 * 10);

    if (!signed?.signedUrl) {
      throw new Error("Failed to create signed URL");
    }

    // Call OCR Edge Function
    const ocrResponse = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/ocr-scan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          kind: "ticket",
          file_url: signed.signedUrl,
          driverId: driver.id,
        }),
      },
    );

    const ocrResult = await ocrResponse.json();

    if (!ocrResponse.ok) {
      console.error("OCR error:", ocrResult);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ Failed to scan ticket. Please make sure the image is clear.</Message>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Success response
    const ticketInfo = ocrResult.ticket || {};
    const message = `✅ Ticket received!\n\nPartner: ${ticketInfo.partner_name || "Unknown"}\nMaterial: ${ticketInfo.material || "Unknown"}\nQty: ${ticketInfo.quantity || "?"} ${ticketInfo.unit_type || ""}\nPay: $${ticketInfo.total_pay || "0.00"}\n\nStatus: Pending Manager Review`;

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${message}</Message>
      </Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  } catch (err: any) {
    console.error("SMS webhook error:", err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>❌ System error. Please try uploading through the app.</Message>
      </Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }
}
