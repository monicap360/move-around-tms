import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = supabaseAdmin;

  const { ticket_id, status } = await req.json();

  const { error } = await supabase
    .from("aggregate_tickets")
    .update({ status })
    .eq("id", ticket_id);

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ success: true });
}
