// Supabase Edge Function: Unified OCR Scan
// Handles both Aggregate Tickets and HR Documents in one endpoint.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import vision from "https://esm.sh/@google-cloud/vision@3.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Partner {
  id: string;
  name: string;
  email_domain: string | null;
  regex_patterns: any;
  pay_rate: number | null;
  bill_rate: number | null;
  material_codes: any;
  active: boolean;
}

const visionClient = new (vision as any).ImageAnnotatorClient();

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const kind: "ticket" | "hr" | undefined = body.kind;

    // Normalize inputs
    const fileUrl = body.file_url || body.imageUrl || null;
    const imageBase64 = body.imageBase64 || null;
    if (!fileUrl && !imageBase64)
      return json({ error: "Missing file_url/imageUrl or imageBase64" }, 400);

    // OCR via Google Vision
    const [result] = await visionClient.textDetection(
      fileUrl || { content: imageBase64 },
    );
    const rawText = result?.textAnnotations?.[0]?.description ?? "";

    // Dispatch by kind or inference
    if (kind === "hr" || (!kind && shouldTreatAsHr(rawText, body))) {
      const out = await handleHrDoc({
        rawText,
        fileUrl,
        body,
        supabase,
        result,
      });
      return json(out);
    } else {
      const out = await handleTicket({
        rawText,
        fileUrl,
        body,
        supabase,
        result,
      });
      return json(out);
    }
  } catch (error: any) {
    console.error("Unified OCR error:", error);
    return json({ error: error.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function shouldTreatAsHr(rawText: string, body: any) {
  if (body.kind === "hr") return true;
  // Heuristics: keywords that indicate license/medical context
  return /license|medical|exam|mvr/i.test(rawText);
}

async function handleHrDoc({ rawText, fileUrl, body, supabase, result }: any) {
  const docType = /medical|exam/i.test(rawText)
    ? "Medical Certificate"
    : /driver|license/i.test(rawText)
      ? "Driver License"
      : "Other";

  const expMatch = rawText.match(/(Exp.*?:?\s*)(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const expiration_date = expMatch ? expMatch[2] : null;
  const nameMatch = rawText.match(/Name[:\s]+([A-Za-z\s]+)/i);
  const licenseMatch = rawText.match(
    /(DL|License|Lic\.?)[#:\s]*([A-Z0-9\-]+)/i,
  );
  const stateMatch = rawText.match(/State[:\s]+([A-Z]{2})/i);
  const issueMatch = rawText.match(
    /Issue(?:d)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  );

  const full_name =
    (body.full_name_hint || nameMatch?.[1] || "").trim() || null;
  const license_number = licenseMatch?.[2] || null;
  const state = stateMatch?.[1] || null;
  const issue_date = issueMatch?.[1] || null;

  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, name, license_number");
  const matched = await matchDriverFromOcr(
    rawText,
    drivers || [],
    supabase,
    full_name,
    license_number,
  );

  const { data: inserted, error } = await supabase
    .from("driver_documents")
    .insert({
      driver_id: matched?.id || body.driverId || null,
      doc_type: docType,
      full_name,
      license_number,
      state,
      issue_date: issue_date
        ? new Date(issue_date).toISOString().slice(0, 10)
        : null,
      expiration_date: expiration_date
        ? new Date(expiration_date).toISOString().slice(0, 10)
        : null,
      image_url: fileUrl || null,
      ocr_raw_text: rawText,
      ocr_confidence: result?.fullTextAnnotation ? 95 : 80,
      auto_matched: Boolean(matched),
      driver_matched_confidence: matched?.confidence || null,
      status: "Pending Manager Review",
    })
    .select();

  if (error) throw error;
  return {
    success: true,
    kind: "hr",
    docType,
    expiration_date,
    matched_driver: matched || null,
    inserted,
  };
}

async function handleTicket({ rawText, fileUrl, body, supabase, result }: any) {
  // Fetch partners
  const { data: partners, error: partnersError } = await supabase
    .from("aggregate_partners")
    .select("*")
    .eq("active", true);
  if (partnersError) throw partnersError;

  // Match partner
  let matchedPartner: Partner | null = null;
  for (const p of (partners || []) as Partner[]) {
    if (rawText.toLowerCase().includes(p.name.toLowerCase())) {
      matchedPartner = p;
      break;
    }
    if (p.regex_patterns?.company_hint) {
      const regex = new RegExp(p.regex_patterns.company_hint, "i");
      if (regex.test(rawText)) {
        matchedPartner = p;
        break;
      }
    }
  }

  // Extract ticket data
  const ticketData = extractTicketData(rawText, matchedPartner);

  // Match driver
  const { data: drivers } = await supabase.from("drivers").select("id, name");
  const matchedDriver = await matchDriverFromOcr(
    rawText,
    drivers || [],
    supabase,
  );

  // Rates
  const defaultPayRate = 25;
  const defaultBillRate = 35;
  const payRate = matchedPartner?.pay_rate ?? defaultPayRate;
  const billRate = matchedPartner?.bill_rate ?? defaultBillRate;

  let finalPayRate = payRate;
  let finalBillRate = billRate;
  if (matchedPartner?.material_codes && ticketData.material) {
    const adj = matchedPartner.material_codes[ticketData.material];
    if (adj) {
      finalPayRate = adj.pay_rate ?? payRate;
      finalBillRate = adj.bill_rate ?? billRate;
    }
  }

  const quantity = ticketData.quantity || 0;
  const totalPay = quantity * finalPayRate;
  const totalBill = quantity * finalBillRate;
  const totalProfit = quantity * (finalBillRate - finalPayRate);

  const { data: ticket, error: insertError } = await supabase
    .from("aggregate_tickets")
    .insert({
      partner_id: matchedPartner?.id || null,
      driver_id: matchedDriver?.id || body.driverId || null,
      driver_name_ocr: ticketData.driverName || null,
      driver_matched_confidence: matchedDriver?.confidence || null,
      auto_matched: Boolean(matchedDriver),
      ticket_number: ticketData.ticketNumber,
      material: ticketData.material,
      quantity: quantity,
      unit_type: ticketData.unitType || "Ton",
      pay_rate: finalPayRate,
      bill_rate: finalBillRate,
      total_pay: totalPay,
      total_bill: totalBill,
      total_profit: totalProfit,
      fleet_id: body.fleetId || null,
      ticket_date: ticketData.ticketDate || new Date().toISOString(),
      status: "Pending Manager Review",
      ocr_raw_text: rawText,
      ocr_confidence: result?.fullTextAnnotation ? 95 : 80,
      ocr_processed_at: new Date().toISOString(),
      image_url: fileUrl || null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Score confidence for the new ticket (async, non-blocking)
  // Use Deno's fetch to call the API endpoint
  const driver_id = matchedDriver?.id || body.driverId || ticket.driver_id;
  if (ticket.id && (ticket.quantity || ticket.pay_rate || ticket.bill_rate)) {
    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
    fetch(`${appUrl}/api/tickets/score-confidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        driverId: driver_id,
      }),
    }).catch((err) => 
      console.error(`Error scoring confidence for ticket ${ticket.id}:`, err)
    );
  }

  return {
    success: true,
    kind: "ticket",
    ticket,
    matched_partner: matchedPartner?.name || null,
    matched_driver: matchedDriver
      ? {
          id: matchedDriver.id,
          name: matchedDriver.name,
          confidence: matchedDriver.confidence,
        }
      : null,
    extracted_data: ticketData,
    rates: { pay_rate: finalPayRate, bill_rate: finalBillRate },
  };
}

function extractTicketData(text: string, partner: Partner | null): any {
  const data: any = {};
  const ticketRegex = partner?.regex_patterns?.ticket_no
    ? new RegExp(partner.regex_patterns.ticket_no, "i")
    : /ticket\s*#?\s*:?\s*(\w+)/i;
  const ticketMatch = text.match(ticketRegex);
  data.ticketNumber = ticketMatch ? ticketMatch[1] : null;

  const materialRegex = partner?.regex_patterns?.material
    ? new RegExp(partner.regex_patterns.material, "i")
    : /material\s*:?\s*([^\n]+)/i;
  const materialMatch = text.match(materialRegex);
  data.material = materialMatch ? materialMatch[1].trim() : null;

  const quantityRegex = partner?.regex_patterns?.quantity
    ? new RegExp(partner.regex_patterns.quantity, "i")
    : /(\d+(?:\.\d+)?)\s*(tons?|yards?|loads?)/i;
  const quantityMatch = text.match(quantityRegex);
  data.quantity = quantityMatch ? parseFloat(quantityMatch[1]) : null;
  data.unitType = quantityMatch ? quantityMatch[2].replace(/s$/, "") : "Ton";

  const dateRegex = partner?.regex_patterns?.date
    ? new RegExp(partner.regex_patterns.date, "i")
    : /date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i;
  const dateMatch = text.match(dateRegex);
  data.ticketDate = dateMatch ? new Date(dateMatch[1]).toISOString() : null;

  const driverRegex =
    /(?:driver|operator|hauler)\s*:?\s*([a-z]+(?:\s+[a-z]+)*)/i;
  const driverMatch = text.match(driverRegex);
  data.driverName = driverMatch ? driverMatch[1].trim() : null;

  return data;
}

async function matchDriverFromOcr(
  text: string,
  drivers: any[],
  supabase: any,
  fullNameHint?: string | null,
  licenseNumberHint?: string | null,
): Promise<{ id: string; name: string; confidence: number } | null> {
  const lower = text.toLowerCase();

  if (licenseNumberHint) {
    const hit = (drivers || []).find(
      (d: any) => d.license_number && d.license_number === licenseNumberHint,
    );
    if (hit) return { id: hit.id, name: hit.name, confidence: 98 };
  }

  if (fullNameHint) {
    const hit = (drivers || []).find((d: any) =>
      d.name.toLowerCase().includes(fullNameHint.toLowerCase()),
    );
    if (hit) return { id: hit.id, name: hit.name, confidence: 92 };
  }

  for (const d of drivers || []) {
    if (lower.includes(d.name?.toLowerCase?.() || ""))
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

  for (const d of drivers || []) {
    const parts = (d.name || "").toLowerCase().split(" ");
    for (const p of parts)
      if (p.length > 3 && lower.includes(p))
        return { id: d.id, name: d.name, confidence: 60 };
  }

  return null;
}
