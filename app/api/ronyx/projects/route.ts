import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizePayload(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = { ...payload };
  delete cleaned.created_at;
  delete cleaned.updated_at;
  return cleaned;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_projects")
    .insert(cleaned)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});

  if (!cleaned.id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_projects")
    .update(cleaned)
    .eq("id", cleaned.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}
