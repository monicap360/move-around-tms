import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runOcr } from "@/lib/fast-scan-ocr";
import { TMS_BUCKET } from "@/lib/storage-paths";
import { syncScanToAgg, stripAndRetry } from "@/lib/fast-scan/syncToAgg";

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

    // Persist the extracted fields back onto the scan doc and mark it completed
    // (previously the OCR results were returned but never saved).
    const docUpdate: Record<string, any> = {
      ocr_status:    "completed",
      scan_status:   "needs_review",
      ticket_number: fields.ticket_number || doc.ticket_number || null,
      truck_number:  fields.truck_number || null,
      driver_name:   fields.driver_printed_name || null,
      ticket_date:   fields.ticket_date || null,
      customer_name: (fields as any).customer || null,
      material:      fields.material || null,
      quantity:      (fields as any).loads ?? null,
      has_driver_signature: !!fields.signature_present,
      raw_ocr_text:  (fields as any).raw_ocr_text || null,
      confidence_score: fields.extraction_confidence ?? fields.ocr_confidence ?? null,
    };
    const { data: updatedDoc } = await stripAndRetry(
      (p) => sb.from("fast_scan_documents").update(p).eq("id", document_id).select("*").single(),
      docUpdate,
    );
    const scan = updatedDoc || { ...doc, ...docUpdate };

    // Mirror into aggregate_tickets (the agg portion payroll reads) — payroll-ready.
    const agg = await syncScanToAgg(sb, scan);

    // Audit event
    await sb.from("fast_scan_audit_events").insert({
      organization_id:       doc.organization_id,
      fast_scan_document_id: document_id,
      event_type:            "ocr_completed",
      event_note:            `Claude OCR extraction — conf: ${fields.ocr_confidence}%`,
      event_payload:         {
        ocr_confidence:        fields.ocr_confidence,
        extraction_confidence: fields.extraction_confidence,
        agg_synced:            agg.synced,
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
        customer:      (fields as any).customer,
        location:      (fields as any).location,
        loads:         (fields as any).loads,
        material:      fields.material,
        total_hours:   (fields as any).total_hours,
        signature:     fields.signature_present,
      },
      ticket_number:  docUpdate.ticket_number,
      payroll_ready:  agg.synced,
      payroll_note:   agg.reason || null,
    }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OCR processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
