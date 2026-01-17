import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_driver_deductions").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deductions: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const payload = await req.json();
  const { data, error } = await supabase.from("ronyx_driver_deductions").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deduction: data });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const payload = await req.json();
  const { id, ...updates } = payload || {};
  if (!id) {
    return NextResponse.json({ error: "Missing deduction id" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("ronyx_driver_deductions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deduction: data });
}
