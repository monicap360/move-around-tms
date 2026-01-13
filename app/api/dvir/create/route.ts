import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const form = await req.formData();
  const driver_uuid = form.get("driver_uuid");
  const truck = form.get("truck");
  const type = form.get("type");
  const defects = form.get("defects");
  const notes = form.get("notes");
  // For demo: skip photo upload logic
  const { error } = await supabase.from("dvir").insert({
    driver_uuid,
    truck,
    type,
    defects,
    notes,
    created_at: new Date().toISOString(),
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
