import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/ronyx/backup — returns all data needed for the Backup Center
export async function GET() {
  const sb = supabaseAdmin;

  const [uploadsRes, dispatchRes, payoutRes, driversRes, ooRes] = await Promise.all([
    sb.from("original_uploads")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    sb.from("dispatch_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    sb.from("payout_import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    sb.from("ronyx_owner_operators")
      .select("id, company_name, status, created_at")
      .order("company_name")
      .limit(500),
    sb.from("ronyx_owner_operators")
      .select("count", { count: "exact", head: true }),
  ]);

  // Map DB columns (upload_type/bucket_name/file_name/created_at + metadata)
  // to the field names the Backup Center page expects.
  const uploads = (uploadsRes.data || []).map((u: any) => ({
    id:               u.id,
    module:           u.upload_type || u.metadata?.module || null,
    source_file_name: u.file_name,
    file_type:        u.metadata?.file_type || null,
    storage_bucket:   u.bucket_name,
    storage_path:     u.storage_path,
    file_size_bytes:  u.file_size_bytes,
    mime_type:        u.mime_type,
    uploaded_at:      u.created_at,
    related_table:    u.metadata?.related_table || null,
  }));

  return NextResponse.json({
    original_uploads:    uploads,
    dispatch_imports:    dispatchRes.data || [],
    payout_batches:      payoutRes.data   || [],
    owner_operators:     driversRes.data  || [],
    counts: {
      original_uploads:  uploadsRes.data?.length   ?? 0,
      dispatch_imports:  dispatchRes.data?.length  ?? 0,
      payout_batches:    payoutRes.data?.length    ?? 0,
      owner_operators:   ooRes.count               ?? 0,
    },
  });
}
