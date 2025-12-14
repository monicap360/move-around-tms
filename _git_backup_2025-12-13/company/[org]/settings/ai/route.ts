import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(_: Request, { params }: any) {
  const supabase = createServerAdmin();
  const org = params.org;

  const { data, error } = await supabase
    .from("ai_assistant_settings")
    .select("*")
    .eq("organization_id", org)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If no settings yet → create default
  if (!data) {
    const { data: created } = await supabase
      .from("ai_assistant_settings")
      .insert({
        organization_id: org,
        enabled: true,
        silent_hours_start: "21:00",
        silent_hours_end: "06:00",
        hide_when_not_used: false,
        assistant_style: "tesla",
      })
      .select()
      .single();

    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: any) {
  const supabase = createServerAdmin();
  const org = params.org;
  const body = await req.json();

  const { data, error } = await supabase
    .from("ai_assistant_settings")
    .update({
      enabled: body.enabled,
      silent_hours_start: body.silent_hours_start,
      silent_hours_end: body.silent_hours_end,
      hide_when_not_used: body.hide_when_not_used,
      assistant_style: body.assistant_style,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", org)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
