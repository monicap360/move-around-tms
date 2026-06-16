import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  // Upsert: remove existing doc of same type, then insert
  await sb.from("ronyx_oo_documents").delete().eq("oo_id", params.id).eq("doc_type", body.doc_type);

  const insertRow: Record<string, unknown> = {
    oo_id:      params.id,
    doc_type:   body.doc_type,
    file_name:  body.file_name  || null,
    expires_on: body.expires_on || null,
  };

  // Include file_url only if the column exists (migration 130)
  if (body.file_url !== undefined) insertRow.file_url = body.file_url || null;

  let { data, error } = await sb
    .from("ronyx_oo_documents")
    .insert(insertRow)
    .select("*")
    .single();

  // If file_url column doesn't exist yet, retry without it
  if (error && error.message?.includes("file_url")) {
    delete insertRow.file_url;
    const retry = await sb.from("ronyx_oo_documents").insert(insertRow).select("*").single();
    data  = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

// PUT — update expiry date (or other scalar) on an existing document record
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();
  if (!body.doc_type) return NextResponse.json({ error: "Missing doc_type" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if ("expires_on" in body) patch.expires_on = body.expires_on || null;
  if ("file_url"   in body) patch.file_url   = body.file_url   || null;
  if ("file_name"  in body) patch.file_name  = body.file_name  || null;

  const { error } = await sb
    .from("ronyx_oo_documents")
    .update(patch)
    .eq("oo_id", params.id)
    .eq("doc_type", body.doc_type);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { doc_type } = await req.json();
  const { error } = await sb.from("ronyx_oo_documents").delete().eq("oo_id", params.id).eq("doc_type", doc_type);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
