import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// List all contract analyses
export async function GET() {
  const { data, error } = await supa
    .from("ai_contract_analysis")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ contracts: data });
}

// Create a new contract analysis record
export async function POST(req) {
  const body = await req.json();
  const { data, error } = await supa
    .from("ai_contract_analysis")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ contract: data });
}
