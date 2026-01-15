// Supabase Edge Function: storage-ocr-webhook
// Trigger: storage.object.created in bucket "ronyx-files", paths: tickets/*
// Purpose: invoke OCR, update DB, broadcast realtime message

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  function json(body: any, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json(
        { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const event = await req.json();
    if (!event?.record?.name) {
      return json({ error: "Missing event.record.name" }, 400);
    }

    const bucket = event.record.bucket ?? event.bucket ?? "ronyx-files";
    const objectPath = event.record.name;

    const file_url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;

    if (objectPath.startsWith("detention/")) {
      const match = objectPath.match(/^detention\/([^\/]+)\//);
      if (!match) {
        return json({ error: "Unable to extract detention_event_id", objectPath }, 400);
      }

      const detention_event_id = match[1];
      const { data: detentionEvent, error: eventError } = await supabase
        .from("detention_events")
        .select("id, organization_id, metadata")
        .eq("id", detention_event_id)
        .single();

      if (eventError || !detentionEvent) {
        return json({ error: "Detention event not found", detention_event_id }, 404);
      }

      const ocrRes = await fetch(`${supabaseUrl}/functions/v1/ocr-scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_url,
          kind: "detention",
          detention_event_id,
        }),
      });

      const ocrData = await ocrRes.json();
      const metadata = detentionEvent.metadata || {};
      const updatedMetadata = {
        ...metadata,
        detention_ocr: {
          raw_text: ocrData.raw_text,
          detected_times: ocrData.detected_times || [],
          file_url,
          processed_at: new Date().toISOString(),
        },
      };

      await supabase
        .from("detention_events")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", detention_event_id);

      const { data: claims } = await supabase
        .from("detention_claims")
        .select("id, evidence")
        .eq("detention_event_id", detention_event_id);

      if (claims?.length) {
        for (const claim of claims) {
          const evidence = claim.evidence || {};
          await supabase
            .from("detention_claims")
            .update({
              evidence: {
                ...evidence,
                detention_ocr: {
                  raw_text: ocrData.raw_text,
                  detected_times: ocrData.detected_times || [],
                  file_url,
                  processed_at: new Date().toISOString(),
                },
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
        }
      }

      return json({ success: true, detention_event_id, ocr: ocrData });
    }

    if (!objectPath.startsWith("tickets/")) {
      return json({ skip: true, reason: "Not a ticket or detention upload", objectPath });
    }

    const match = objectPath.match(/^tickets\/([^\/]+)\//);
    if (!match) {
      return json({ error: "Unable to extract ticket_id", objectPath }, 400);
    }

    const ticket_id = match[1];
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return json({ error: "Ticket not found", ticket_id }, 404);
    }

    const ocrRes = await fetch(`${supabaseUrl}/functions/v1/ocr-scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url,
        ticket_id,
        organization_id: ticket.organization_id,
        driverId: ticket.driver_id,
        kind: "ticket",
      }),
    });

    const ocrData = await ocrRes.json();

    await supabase
      .from("aggregate_tickets")
      .update({
        ocr_json: ocrData,
        ocr_processed_at: new Date().toISOString(),
        status: ocrData.success ? "ocr_completed" : ticket.status,
      })
      .eq("id", ticket_id);

    await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: `ticket.${ticket_id}.ocr`,
        event: "ocr_completed",
        payload: {
          ticket_id,
          extracted: ocrData.extracted_data ?? {},
        },
      }),
    });

    return json({ success: true, ticket_id, ocr: ocrData });
  } catch (err) {
    console.error("storage-ocr-webhook error:", err);
    return json({ error: err.message ?? "Unknown error" }, 500);
  }
});
