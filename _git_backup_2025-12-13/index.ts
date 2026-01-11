// supabase/functions/storage-ocr-webhook/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  try {
    // Parse webhook payload from Storage
    const event = await req.json();

    const { bucket, name: file_path } = event?.record || {};
    if (!bucket || !file_path) {
      return new Response("Missing bucket or path", { status: 400 });
    }

    // Only run OCR on ticket uploads
    if (!file_path.startsWith("tickets/")) {
      return new Response("Ignored non-ticket file", { status: 200 });
    }

    // Extract ticket_id from folder structure:
    // tickets/<ticket_id>/<filename>
    const parts = file_path.split("/");
    const ticket_id = parts[1];

    if (!ticket_id) {
      return new Response("Could not extract ticket_id", { status: 400 });
    }

    // Fetch the ticket to retrieve org + driver
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, driver_id, organization_id")
      .eq("id", ticket_id)
      .maybeSingle();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError);
      return new Response("Ticket not found", { status: 404 });
    }

    // Fire OCR function
    const { data, error } = await supabase.functions.invoke("ocr", {
      body: {
        ticket_id: ticket.id,
        driver_id: ticket.driver_id,
        organization_id: ticket.organization_id,
        image_path: file_path,
      },
    });

    if (error) {
      console.error("OCR function error:", error);
      return new Response("OCR failed", { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, ocr: data }), {
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
