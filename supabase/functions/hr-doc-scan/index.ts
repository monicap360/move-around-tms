// Supabase Edge Function: HR Doc Scan
// Detects document type (Driver License / Medical Certificate), extracts fields,
// and creates driver_documents rows.
// Uses Google Vision REST API — Node.js SDK is incompatible with Deno.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleAuth } from "https://esm.sh/google-auth-library@8.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function runVisionOCR(
  imageSource: string,
  isBase64: boolean,
): Promise<{ text: string; confidence: number }[]> {
  const credsRaw = Deno.env.get("GOOGLE_VISION_CREDENTIALS");
  if (!credsRaw) throw new Error("GOOGLE_VISION_CREDENTIALS env var not set");

  const auth = new GoogleAuth({
    credentials: JSON.parse(credsRaw),
    scopes: ["https://www.googleapis.com/auth/cloud-vision"],
  });
  const token = (await auth.getAccessToken()).token;

  const imagePayload = isBase64
    ? { content: imageSource }
    : { source: { imageUri: imageSource } };

  const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ image: imagePayload, features: [{ type: "TEXT_DETECTION" }] }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Vision API error: ${JSON.stringify(data.error)}`);

  const annotations = data.responses?.[0]?.textAnnotations ?? [];
  return annotations.map((a: any) => ({
    text: a.description ?? "",
    confidence: a.confidence ?? 0.85,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { imageUrl, imageBase64, driverId } = await req.json();
    if (!imageUrl && !imageBase64) {
      return json({ ok: false, message: "Missing imageUrl or imageBase64" }, 400);
    }

    const isBase64 = Boolean(imageBase64);
    const ocrResults = await runVisionOCR(imageBase64 || imageUrl, isBase64);
    const text = ocrResults.map((d) => d.text).join(" ");

    const licenseMatch = /CDL|Driver'?s\sLicense/i.test(text);
    const medCertMatch = /Medical\sCertificate/i.test(text);
    const docType = licenseMatch ? "Driver License" : medCertMatch ? "Medical Certificate" : "Other";

    const nameMatch    = text.match(/Name[:\s]+([A-Za-z\s]+)/i);
    const expMatch     = text.match(/Exp(?:iration)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const licNoMatch   = text.match(/(DL|License|Lic\.?)[#:\s]*([A-Z0-9\-]+)/i);
    const stateMatch   = text.match(/State[:\s]+([A-Z]{2})/i);
    const issueMatch   = text.match(/Issue(?:d)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

    const full_name       = nameMatch?.[1]?.trim() || null;
    const expiration_date = expMatch?.[1] ? new Date(expMatch[1]).toISOString().slice(0, 10) : null;
    const license_number  = licNoMatch?.[2] || null;
    const state           = stateMatch?.[1] || null;
    const issue_date      = issueMatch?.[1] ? new Date(issueMatch[1]).toISOString().slice(0, 10) : null;

    const { data: drivers } = await supabase.from("drivers").select("id, name");
    const matchedDriver = await matchDriverFromOcr(text, drivers || [], supabase);

    const { data: doc, error } = await supabase.from("driver_documents").insert({
      driver_id:                matchedDriver?.id || driverId || null,
      doc_type:                 docType,
      full_name,
      license_number,
      state,
      issue_date,
      expiration_date,
      image_url:                imageUrl || null,
      ocr_raw_text:             text,
      ocr_confidence:           calculateAverageConfidence(ocrResults),
      auto_matched:             Boolean(matchedDriver),
      driver_matched_confidence: matchedDriver?.confidence || null,
      status:                   "Pending Manager Review",
    }).select().single();

    if (error) throw new Error(error.message);
    return json({ ok: true, document: doc, matched_driver: matchedDriver || null });
  } catch (err: any) {
    console.error("HR Doc Scan Error:", err);
    return json({ ok: false, message: err.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function calculateAverageConfidence(results: { text: string; confidence: number }[]): number {
  if (!results.length) return 0;
  const sum = results.reduce((acc, r) => acc + r.confidence, 0);
  return Math.round((sum / results.length) * 100);
}

async function matchDriverFromOcr(
  text: string,
  drivers: any[],
  supabase: any,
): Promise<{ id: string; name: string; confidence: number } | null> {
  const lower = text.toLowerCase();

  for (const d of drivers) {
    if (lower.includes(d.name.toLowerCase())) return { id: d.id, name: d.name, confidence: 95 };
  }

  const { data: aliases } = await supabase
    .from("driver_aliases")
    .select("driver_id, alias, confidence_boost, drivers(id, name)");

  if (aliases) {
    for (const a of aliases) {
      if (lower.includes(a.alias.toLowerCase())) {
        return { id: a.drivers.id, name: a.drivers.name, confidence: Math.min(95, 70 + (a.confidence_boost || 0)) };
      }
    }
  }

  for (const d of drivers) {
    const parts = d.name.toLowerCase().split(" ");
    for (const p of parts)
      if (p.length > 3 && lower.includes(p)) return { id: d.id, name: d.name, confidence: 60 };
  }

  return null;
}
