import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export type OcrFields = {
  ticket_number:          string | null;
  truck_number:           string | null;
  ticket_date:            string | null;
  truck_type:             string | null;
  shift_type:             string | null;
  loads:                  number | null;
  material:               string | null;
  company_name_of_truck:  string | null;
  customer:               string | null;
  location:               string | null;
  driver_printed_name:    string | null;
  authorized_person:      string | null;
  signature_present:      boolean;
  start_time:             string | null;
  end_time:               string | null;
  total_hours:            number | null;
  copy_color:             string | null;
  raw_ocr_text:           string | null;
  ocr_confidence:         number;
  extraction_confidence:  number;
};

const OCR_PROMPT = `You are an OCR assistant for a transportation management system (dump truck / heavy haul).
Extract ALL visible data from this field ticket image.

Return ONLY a valid JSON object with these exact fields (use null for anything not found):
{
  "ticket_number": "string",
  "truck_number": "string",
  "ticket_date": "YYYY-MM-DD or null",
  "truck_type": "string (e.g. 'End Dump', 'Belly Dump', 'Water Truck')",
  "shift_type": "string (e.g. 'Day', 'Night')",
  "loads": number or null,
  "material": "string (e.g. 'Dirt', 'Gravel', 'Asphalt')",
  "company_name_of_truck": "string",
  "customer": "string (company hiring the truck)",
  "location": "string (job site / address)",
  "driver_printed_name": "string",
  "authorized_person": "string (supervisor who signed)",
  "signature_present": true or false,
  "start_time": "HH:MM or null",
  "end_time": "HH:MM or null",
  "total_hours": number or null,
  "copy_color": "string (e.g. 'White', 'Yellow', 'Pink')",
  "raw_ocr_text": "all visible text concatenated",
  "ocr_confidence": number 0-100,
  "extraction_confidence": number 0-100
}

Return ONLY the JSON — no markdown, no explanation.`;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function runOcr(
  bucket: string,
  objectPath: string,
  documentId: string,
): Promise<{ fields: OcrFields; rawResponse: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-ant-REPLACE")) {
    throw new Error("ANTHROPIC_API_KEY is not set. Get a key at console.anthropic.com and add it to .env.local");
  }

  const sb = adminClient();

  // Get 10-minute signed URL for the file
  const { data: signed, error: signErr } = await sb.storage
    .from(bucket)
    .createSignedUrl(objectPath, 600);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Cannot create signed URL for OCR: ${signErr?.message || "unknown"}`);
  }

  // Fetch the file bytes
  const fileRes = await fetch(signed.signedUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download file for OCR: ${fileRes.status} ${fileRes.statusText}`);
  }

  const contentType = fileRes.headers.get("content-type") || "image/jpeg";
  const buffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Claude vision only supports image/* — for PDFs we fall back to text extraction
  const isImage = contentType.startsWith("image/");
  const mediaType = isImage
    ? (contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
    : "image/jpeg";

  const anthropic = new Anthropic({ apiKey });

  let rawResponse = "";

  if (isImage) {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: OCR_PROMPT },
          ],
        },
      ],
    });
    rawResponse = msg.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("");
  } else {
    // PDF — ask Claude to extract what it can from the text layer / description
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `This is a base64-encoded PDF of a field ticket. Extract the ticket data as best you can from this description.\n\nBase64 length: ${base64.length} chars (${Math.round(base64.length * 0.75 / 1024)} KB)\n\n${OCR_PROMPT}\n\nSince this is a PDF and may not be directly readable, set ocr_confidence to 20 and return null for all fields unless you can determine them from context.`,
        },
      ],
    });
    rawResponse = msg.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("");
  }

  // Parse JSON — strip markdown fences if present
  const clean = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let fields: OcrFields;
  try {
    fields = JSON.parse(clean);
  } catch {
    // Claude returned text, not JSON — build a minimal result
    fields = {
      ticket_number: null, truck_number: null, ticket_date: null,
      truck_type: null, shift_type: null, loads: null, material: null,
      company_name_of_truck: null, customer: null, location: null,
      driver_printed_name: null, authorized_person: null,
      signature_present: false, start_time: null, end_time: null,
      total_hours: null, copy_color: null,
      raw_ocr_text: rawResponse.slice(0, 2000),
      ocr_confidence: 10, extraction_confidence: 10,
    };
  }

  // Update fast_scan_documents with OCR results
  await sb.from("fast_scan_documents").update({
    ocr_status:    "completed",
    ocr_json:      fields,
    ticket_number: fields.ticket_number || undefined,
    truck_number:  fields.truck_number  || undefined,
    driver_name:   fields.driver_printed_name || undefined,
  }).eq("id", documentId).maybeSingle();

  return { fields, rawResponse };
}
