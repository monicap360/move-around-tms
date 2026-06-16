import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/ronyx/backup — returns all data needed for the Backup Center
export async function GET() {
  const sb = createSupabaseServerClient();

  const [uploadsRes, dispatchRes, payoutRes, driversRes, ooRes] = await Promise.all([
    sb.from("original_uploads")
      .select("*")
      .eq("is_deleted", false)
      .order("uploaded_at", { ascending: false })
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

  return NextResponse.json({
    original_uploads:    uploadsRes.data  || [],
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
