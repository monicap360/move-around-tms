import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/ronyx/drivers/documents/all
// Returns all documents from ronyx_driver_documents for the hub view
export async function GET() {
  const sb = supabaseAdmin;

  const { data, error } = await sb
    .from("ronyx_driver_documents")
    .select("id, driver_id, doc_type, file_url, status, expires_on, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}
