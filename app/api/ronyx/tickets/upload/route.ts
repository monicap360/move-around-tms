import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const ticketId = formData.get("ticket_id") as string;
    const docType = (formData.get("doc_type") as string) || "ticket";

    if (!file || !ticketId) {
      return NextResponse.json({ error: "Missing file or ticket_id" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const objectPath = `tickets/${ticketId}/${docType}-${uuidv4()}.${ext}`;

    const { error } = await supabase.storage.from("ticket-uploads").upload(objectPath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Store attachment path on ticket
    const column =
      docType === "receipt"
        ? "delivery_receipt_url"
        : docType === "pod"
          ? "pod_url"
          : "ticket_image_url";

    await supabase
      .from("aggregate_tickets")
      .update({ [column]: objectPath, image_url: objectPath })
      .eq("id", ticketId);

    // Trigger OCR directly to avoid relying on external webhook setup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      const { data: signed } = await supabase.storage
        .from("ticket-uploads")
        .createSignedUrl(objectPath, 60 * 60);

      if (signed?.signedUrl) {
        await fetch(`${supabaseUrl}/functions/v1/ocr-scan`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_url: signed.signedUrl,
            ticket_id: ticketId,
            kind: "ticket",
          }),
        });
      }
    }

    return NextResponse.json({ path: objectPath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
