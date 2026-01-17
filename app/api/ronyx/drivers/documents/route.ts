import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const numericFields = [];

function normalizePayload(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = { ...payload };
  delete cleaned.created_at;
  delete cleaned.updated_at;
  numericFields.forEach((field) => {
    if (field in cleaned) {
      const value = cleaned[field];
      if (value === "" || value === null) {
        cleaned[field] = null;
        return;
      }
      const numberValue = Number(value);
      cleaned[field] = Number.isFinite(numberValue) ? numberValue : null;
    }
  });
  return cleaned;
}

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");
  if (!driverId) {
    return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("ronyx_driver_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});
  if (!cleaned.driver_id || !cleaned.doc_type) {
    return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_driver_documents")
    .insert({ ...cleaned, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ document: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});
  if (!cleaned.id) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_driver_documents")
    .update({ ...cleaned, updated_at: new Date().toISOString() })
    .eq("id", cleaned.id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ document: data });
}
