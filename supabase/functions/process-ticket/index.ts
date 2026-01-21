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

    const { data: imageData, error: downloadError } = await supabaseClient
      .storage
      .from("ronyx-tickets")
      .download(imageUrl);

    if (downloadError) throw downloadError;

    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
    );

    const auth = new GoogleAuth({
      credentials: JSON.parse(Deno.env.get("GOOGLE_VISION_CREDENTIALS") || "{}"),
      scopes: ["https://www.googleapis.com/auth/cloud-vision"],
    });

    const visionResponse = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${(await auth.getAccessToken()).token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    });

    const visionData = await visionResponse.json();
    const extractedText = visionData.responses?.[0]?.fullTextAnnotation?.text || "";

    const ticketData = parseRonyxTicket(extractedText);

    const { error: updateError } = await supabaseClient
      .from("ronyx.tickets")
      .update({
        gross_weight: ticketData.grossWeight,
        tare_weight: ticketData.tareWeight,
        net_weight: ticketData.netWeight,
        rate_amount: ticketData.rate,
        total_amount: ticketData.total,
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("tenant_id", "ronyx");

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

function parseRonyxTicket(text: string) {
  const patterns = {
    ticketNumber: /Ticket\s*#?\s*:?\s*(\w+\d+)/i,
    grossWeight: /Gross\s*:?\s*(\d+\.?\d*)/i,
    tareWeight: /Tare\s*:?\s*(\d+\.?\d*)/i,
    material: /Material\s*:?\s*(\w+)/i,
  };

  const extract = (pattern: RegExp) => {
    const match = text.match(pattern);
    return match ? match[1] : null;
  };

  return {
    ticketNumber: extract(patterns.ticketNumber),
    grossWeight: parseFloat(extract(patterns.grossWeight) || "0"),
    tareWeight: parseFloat(extract(patterns.tareWeight) || "0"),
    netWeight: 0,
    material: extract(patterns.material),
    rate: 0,
    total: 0,
  };
}
