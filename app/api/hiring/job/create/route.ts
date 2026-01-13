import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from("job_posts")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ job: data });
}
