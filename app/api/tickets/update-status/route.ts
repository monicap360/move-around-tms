import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { ticket_id, status } = await req.json();

  const { error } = await supabase
    .from("aggregate_tickets")
    .update({ status })
    .eq("id", ticket_id);

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ success: true });
}
