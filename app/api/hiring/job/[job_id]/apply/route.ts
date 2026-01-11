import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req, { params }) {
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
