import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req, { params }) {
  const supabase = createSupabaseServerClient();
  const { job_id } = params;
  const body = await req.json();
  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      job_id,
      driver_id: body.driver_id,
      driver_uuid: body.driver_uuid,
      message: body.message || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ application: data });
}
