import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_payroll_rules").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rules: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const payload = await req.json();
  const { data, error } = await supabase.from("ronyx_payroll_rules").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rule: data });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const payload = await req.json();
  const { id, ...updates } = payload || {};
  if (!id) {
    return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("ronyx_payroll_rules")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rule: data });
}
