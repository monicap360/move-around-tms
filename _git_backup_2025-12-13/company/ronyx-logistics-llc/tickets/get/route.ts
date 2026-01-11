import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req) {
  const { ticket_uuid } = await req.json();

  const { data, error } = await client
    .from("tickets")
    .select("*")
    .eq("ticket_uuid", ticket_uuid)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json(data);
}
