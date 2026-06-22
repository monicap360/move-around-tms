// Supabase Edge Function: hr-ocr
// Accepts a file URL, runs OCR via Google Vision REST API, auto-matches driver,
// inserts into driver_documents.
// Uses REST API — @google-cloud/vision Node.js SDK is incompatible with Deno.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleAuth } from "https://esm.sh/google-auth-library@8.8.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function runVisionOCR(
  fileUrl: string | null,
  imageBase64: string | null,
): Promise<{ rawText: string; hasFullText: boolean }> {
  const credsRaw = Deno.env.get("GOOGLE_VISION_CREDENTIALS");
  if (!credsRaw) throw new Error("GOOGLE_VISION_CREDENTIALS env var not set");

  const auth = new GoogleAuth({
    credentials: JSON.parse(credsRaw),
    scopes: ["https://www.googleapis.com/auth/cloud-vision"],
  });
  const token = (await auth.getAccessToken()).token;

  const imagePayload = imageBase64
    ? { content: imageBase64 }
    : { source: { imageUri: fileUrl! } };

  const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ image: imagePayload, features: [{ type: "TEXT_DETECTION" }] }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Vision API error: ${JSON.stringify(data.error)}`);

  const rawText =
    data.responses?.[0]?.fullTextAnnotation?.text ??
    data.responses?.[0]?.textAnnotations?.[0]?.description ??
    "";
  return { rawText, hasFullText: !!data.responses?.[0]?.fullTextAnnotation };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { file_url, full_name_hint, driverId } = await req.json();
    if (!file_url) return json({ success: false, error: "file_url required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { rawText, hasFullText } = await runVisionOCR(file_url, null);

    const docType = /medical|exam/i.test(rawText)
      ? "Medical Certificate"
      : /driver|license/i.test(rawText)
        ? "Driver License"
        : "Other";

    const expMatch     = rawText.match(/(Exp.*?:?\s*)(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const nameMatch    = rawText.match(/Name[:\s]+([A-Za-z\s]+)/i);
    const licenseMatch = rawText.match(/(DL|License|Lic\.?)[#:\s]*([A-Z0-9\-]+)/i);
    const stateMatch   = rawText.match(/State[:\s]+([A-Z]{2})/i);
    const issueMatch   = rawText.match(/Issue(?:d)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

    const full_name      = (full_name_hint || nameMatch?.[1] || "").trim() || null;
    const license_number = licenseMatch?.[2] || null;
    const state          = stateMatch?.[1] || null;
    const issue_date     = issueMatch?.[1] || null;
    const expiration_date = expMatch?.[2] || null;

    const { data: drivers } = await supabase.from("drivers").select("id, name");
    const matched = await matchDriverFromOcr(rawText, drivers || [], supabase, full_name);

    const { data: inserted, error } = await supabase.from("driver_documents").insert({
      driver_id:                matched?.id || driverId || null,
      doc_type:                 docType,
      full_name,
      license_number,
      state,
      issue_date:        issue_date ? new Date(issue_date).toISOString().slice(0, 10) : null,
      expiration_date:   expiration_date ? new Date(expiration_date).toISOString().slice(0, 10) : null,
      image_url:         file_url,
      ocr_raw_text:      rawText,
      ocr_confidence:    hasFullText ? 95 : 80,
      auto_matched:      Boolean(matched),
      driver_matched_confidence: matched?.confidence || null,
      status:            "Pending Manager Review",
    }).select();

    if (error) throw error;
    return json({ success: true, matched_driver: matched || null, docType, expiration_date, inserted });
  } catch (err: any) {
    console.error(err);
    return json({ success: false, error: err.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function matchDriverFromOcr(
  text: string,
  drivers: any[],
  supabase: any,
  fullNameHint?: string | null,
): Promise<{ id: string; name: string; confidence: number } | null> {
  const lower = text.toLowerCase();

  if (fullNameHint) {
    const hit = drivers.find((d) => d.name.toLowerCase().includes(fullNameHint.toLowerCase()));
    if (hit) return { id: hit.id, name: hit.name, confidence: 92 };
  }

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
