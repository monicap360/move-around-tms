// Supabase Edge Function: HR Doc Scan
// Detects document type (Driver License / Medical Certificate), extracts fields, and creates driver_documents rows

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OcrDetection {
  text: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { imageUrl, imageBase64, driverId } = await req.json();
    if (!imageUrl && !imageBase64) {
      return json(
        { ok: false, message: "Missing imageUrl or imageBase64" },
        400,
      );
    }

    const ocrResults: OcrDetection[] = await performOcr(
      imageUrl || imageBase64,
    );
    const text = ocrResults.map((d) => d.text).join(" ");

    // Detect doc type
    const licenseMatch = /CDL|Driver'?s\sLicense/i.test(text);
    const medCertMatch = /Medical\sCertificate/i.test(text);

    const docType = licenseMatch
      ? "Driver License"
      : medCertMatch
        ? "Medical Certificate"
        : "Other";

    // Extract name and expiration
    const nameMatch = text.match(/Name[:\s]+([A-Za-z\s]+)/i);
    const expMatch = text.match(
      /Exp(?:iration)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    );
    const licNoMatch = text.match(/(DL|License|Lic\.?)[#:\s]*([A-Z0-9\-]+)/i);
    const stateMatch = text.match(/State[:\s]+([A-Z]{2})/i);
    const issueMatch = text.match(
      /Issue(?:d)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    );

    const full_name = nameMatch?.[1]?.trim() || null;
    const expiration_date = expMatch?.[1]
      ? new Date(expMatch[1]).toISOString().slice(0, 10)
      : null;
    const license_number = licNoMatch?.[2] || null;
    const state = stateMatch?.[1] || null;
    const issue_date = issueMatch?.[1]
      ? new Date(issueMatch[1]).toISOString().slice(0, 10)
      : null;

    // Try to auto-match driver by name
    const { data: drivers } = await supabase.from("drivers").select("id, name");
    const matchedDriver = await matchDriverFromOcr(
      text,
      drivers || [],
      supabase,
    );

    // Insert HR document
    const { data: doc, error } = await supabase
      .from("driver_documents")
      .insert({
        driver_id: matchedDriver?.id || driverId || null,
        doc_type: docType,
        full_name,
        license_number,
        state,
        issue_date,
        expiration_date,
        image_url: imageUrl || null,
        ocr_raw_text: text,
        ocr_confidence: calculateAverageConfidence(ocrResults),
        auto_matched: Boolean(matchedDriver),
        driver_matched_confidence: matchedDriver?.confidence || null,
        status: "Pending Manager Review",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return json({
      ok: true,
      document: doc,
      matched_driver: matchedDriver || null,
    });
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

async function performOcr(imageSource: string): Promise<OcrDetection[]> {
  // TODO: replace with real OCR provider
  return [
    { text: "CDL Driver's License", confidence: 0.93 },
    { text: "Name: John Doe", confidence: 0.9 },
    { text: "Expiration: 12/31/2026", confidence: 0.88 },
    { text: "State: NC", confidence: 0.85 },
    { text: "License: D123-456-7890", confidence: 0.82 },
  ];
}

function calculateAverageConfidence(results: OcrDetection[]): number {
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
    if (lower.includes(d.name.toLowerCase()))
      return { id: d.id, name: d.name, confidence: 95 };
  }

  const { data: aliases } = await supabase
    .from("driver_aliases")
    .select("driver_id, alias, confidence_boost, drivers(id, name)");

  if (aliases) {
    for (const a of aliases) {
      if (lower.includes(a.alias.toLowerCase())) {
        return {
          id: a.drivers.id,
          name: a.drivers.name,
          confidence: Math.min(95, 70 + (a.confidence_boost || 0)),
        };
      }
    }
  }

  for (const d of drivers) {
    const parts = d.name.toLowerCase().split(" ");
    for (const p of parts)
      if (p.length > 3 && lower.includes(p))
        return { id: d.id, name: d.name, confidence: 60 };
  }

  return null;
}
