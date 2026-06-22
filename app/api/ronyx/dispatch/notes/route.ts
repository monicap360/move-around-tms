import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set(["customer","driver","manager","payment","delay","complaint","internal"]);

export async function POST(req: Request) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  if (!body.job_id || !body.body) {
    return NextResponse.json({ error: "job_id and body are required" }, { status: 400 });
  }

  const category = VALID_CATEGORIES.has(body.category) ? body.category : "internal";

  const { data, error } = await supabase
    .from("dispatch_notes")
    .insert({
      job_id:     body.job_id,
      category,
      body:       body.body,
      created_by: body.created_by || "dispatch",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId) return NextResponse.json({ notes: [] });

  const { data, error } = await supabase
    .from("dispatch_notes")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ notes: [], error: error.message });
  return NextResponse.json({ notes: data || [] });
}
