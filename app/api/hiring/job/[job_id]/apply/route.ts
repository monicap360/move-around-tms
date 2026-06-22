import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, props: { params: Promise<{ job_id: string }> }) {
  const params = await props.params;
  const supabase = supabaseAdmin;
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
