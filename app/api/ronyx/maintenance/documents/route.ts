import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unit_id");

  let query = supabase
    .from("maintenance_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (unitId) query = query.eq("unit_id", unitId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ documents: [], error: error.message });
  return NextResponse.json({ documents: data || [] });
}

export async function POST(request: Request) {
  const supabase = supabaseAdmin;
  const formData = await request.formData();

  const file          = formData.get("file") as File | null;
  const unitId        = formData.get("unit_id") as string;
  const workOrderId   = formData.get("work_order_id") as string | null;
  const documentType  = formData.get("document_type") as string || "General";
  const expiresAt     = formData.get("expires_at") as string | null;

  if (!file || !unitId) {
    return NextResponse.json({ error: "file and unit_id are required" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const fileName  = `maintenance/${unitId}/${Date.now()}-${file.name}`;
  const arrayBuf  = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("maintenance-docs")
    .upload(fileName, arrayBuf, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: urlData } = supabase.storage
    .from("maintenance-docs")
    .getPublicUrl(fileName);

  const { data, error } = await supabase
    .from("maintenance_documents")
    .insert({
      unit_id:       unitId,
      work_order_id: workOrderId || null,
      document_type: documentType,
      file_name:     file.name,
      file_url:      urlData.publicUrl,
      expires_at:    expiresAt || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ document: data }, { status: 201 });
}
