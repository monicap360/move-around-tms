import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  // Upsert: remove existing doc of same type, then insert
  await sb.from("ronyx_oo_documents").delete().eq("oo_id", params.id).eq("doc_type", body.doc_type);

  const { data, error } = await sb
    .from("ronyx_oo_documents")
    .insert({
      oo_id:      params.id,
      doc_type:   body.doc_type,
      file_name:  body.file_name  || null,
      file_url:   body.file_url   || null,
      expires_on: body.expires_on || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { doc_type } = await req.json();
  const { error } = await sb.from("ronyx_oo_documents").delete().eq("oo_id", params.id).eq("doc_type", doc_type);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
