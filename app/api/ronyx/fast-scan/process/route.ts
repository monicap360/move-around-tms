import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runOcr } from "@/lib/fast-scan-ocr";
import { TMS_BUCKET } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // OCR can take up to 60s

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// POST /api/ronyx/fast-scan/process
// Body: { document_id: string }
// Runs Claude vision OCR on the file, updates fast_scan_documents,
// then posts extracted fields to /api/ronyx/fast-scan/ocr to create the ticket.
export async function POST(req: NextRequest) {
  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return NextResponse.json({ error: "document_id is required" }, { status: 400 });
    }

    const sb = adminClient();

    // Fetch the fast_scan_document record
    const { data: doc, error: fetchErr } = await sb
      .from("fast_scan_documents")
      .select("id, organization_id, bucket_id, object_path, original_filename, ocr_status, ticket_number, truck_number, driver_name")
      .eq("id", document_id)
      .single();

    if (fetchErr || !doc) {
      return NextResponse.json({ error: fetchErr?.message || "Document not found" }, { status: 404 });
    }

    if (doc.ocr_status === "completed") {
      return NextResponse.json({ message: "OCR already completed", document_id }, { status: 200 });
    }

    // Mark as processing
    await sb.from("fast_scan_documents")
      .update({ ocr_status: "processing" })
      .eq("id", document_id)
      .maybeSingle();

    const bucket = doc.bucket_id || TMS_BUCKET;

    // Run Claude vision OCR
    const { fields } = await runOcr(bucket, doc.object_path, document_id);

    // Submit to the ticket-creation OCR endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const ocrRes = await fetch(`${baseUrl}/api/ronyx/fast-scan/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fields,
        scan_source:         "fast_scan_upload",
        original_upload_id:  document_id,
      }),
    });

    let ticket: { ticket_id?: string; ticket_number?: string; missing_fields?: string[]; qr_url?: string } | null = null;
    if (ocrRes.ok || ocrRes.status === 201) {
      ticket = await ocrRes.json();
    }

    // Audit event
    await sb.from("fast_scan_audit_events").insert({
      organization_id:       doc.organization_id,
      fast_scan_document_id: document_id,
      event_type:            "ocr_completed",
      event_note:            `Claude OCR extraction — conf: ${fields.ocr_confidence}%`,
      event_payload:         {
        ocr_confidence:        fields.ocr_confidence,
        extraction_confidence: fields.extraction_confidence,
        ticket_id:             ticket?.ticket_id || null,
        missing_fields:        ticket?.missing_fields || [],
      },
    }).maybeSingle();

    return NextResponse.json({
      document_id,
      ocr_status:            "completed",
      ocr_confidence:        fields.ocr_confidence,
      extraction_confidence: fields.extraction_confidence,
      extracted: {
        ticket_number: fields.ticket_number,
        truck_number:  fields.truck_number,
        driver_name:   fields.driver_printed_name,
        ticket_date:   fields.ticket_date,
        customer:      fields.customer,
        location:      fields.location,
        loads:         fields.loads,
        material:      fields.material,
        total_hours:   fields.total_hours,
        signature:     fields.signature_present,
      },
      ticket_id:     ticket?.ticket_id     || null,
      ticket_number: ticket?.ticket_number || fields.ticket_number || null,
      missing_fields: ticket?.missing_fields || [],
      qr_url:        ticket?.qr_url        || null,
    }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OCR processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
