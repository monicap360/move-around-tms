import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function DELETE(req, { params }) {
  const { organization_code } = params;
  const { ticket_id } = await req.json();

  if (!ticket_id) {
    return NextResponse.json({ error: "Missing ticket_id" }, { status: 400 });
  }

  const { data: org } = await supa
    .from("organizations")
    .select("id")
    .eq("organization_code", organization_code)
    .single();

  const { error } = await supa
    .from("tickets")
    .delete()
    .eq("id", ticket_id)
    .eq("organization_id", org.id);

  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ success: true });
}
