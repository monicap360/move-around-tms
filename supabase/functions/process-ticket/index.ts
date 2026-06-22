import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { GoogleAuth } from "https://esm.sh/google-auth-library@8.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { ticketId, imageUrl } = await req.json();
    if (!ticketId || !imageUrl) {
      return new Response(JSON.stringify({ success: false, error: "ticketId and imageUrl are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download image from storage (supports private buckets)
    const { data: imageData, error: downloadError } = await supabaseClient.storage
      .from("ronyx-files")
      .download(imageUrl);

    if (downloadError) throw downloadError;

    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
    );

    // Call Vision REST API
    const auth = new GoogleAuth({
      credentials: JSON.parse(Deno.env.get("GOOGLE_VISION_CREDENTIALS") || "{}"),
      scopes: ["https://www.googleapis.com/auth/cloud-vision"],
    });

    const token = (await auth.getAccessToken()).token;
    const visionResponse = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: "TEXT_DETECTION" }] }],
      }),
    });

    const visionData = await visionResponse.json();
    if (visionData.error) throw new Error(`Vision API error: ${JSON.stringify(visionData.error)}`);

    const extractedText =
      visionData.responses?.[0]?.fullTextAnnotation?.text ??
      visionData.responses?.[0]?.textAnnotations?.[0]?.description ??
      "";

    const ticketData = parseTicket(extractedText);

    const { error: updateError } = await supabaseClient
      .from("aggregate_tickets")
      .update({
        gross_weight:    ticketData.grossWeight,
        tare_weight:     ticketData.tareWeight,
        net_weight:      ticketData.netWeight,
        rate_amount:     ticketData.rate,
        total_amount:    ticketData.total,
        ocr_raw_text:    extractedText,
        ocr_processed_at: new Date().toISOString(),
        status:          "ocr_completed",
      })
      .eq("id", ticketId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, data: ticketData, ticketId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error processing ticket:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

function parseTicket(text: string) {
  const extract = (pattern: RegExp) => text.match(pattern)?.[1] ?? null;

  const grossWeight = parseFloat(extract(/Gross\s*:?\s*(\d+\.?\d*)/i) || "0");
  const tareWeight  = parseFloat(extract(/Tare\s*:?\s*(\d+\.?\d*)/i)  || "0");
  const netWeight   = grossWeight - tareWeight;

  return {
    ticketNumber: extract(/Ticket\s*#?\s*:?\s*(\w+\d+)/i),
    grossWeight,
    tareWeight,
    netWeight,
    material: extract(/Material\s*:?\s*(\w+)/i),
    rate:  0,
    total: 0,
  };
}
