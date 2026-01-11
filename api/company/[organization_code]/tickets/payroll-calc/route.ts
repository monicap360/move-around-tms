import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req, { params }) {
  const { organization_code } = params;
  const { ticket_ids } = await req.json();

  const { data: org } = await supa
    .from("organizations")
    .select("id")
    .eq("organization_code", organization_code)
    .single();

  const { data: tickets, error } = await supa
    .from("tickets")
    .select("*")
    .in("id", ticket_ids)
    .eq("organization_id", org.id);

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Example payroll calculation: sum ticket amounts
  const totalPayroll = tickets.reduce((sum, t) => sum + (t.amount || 0), 0);

  return NextResponse.json({ totalPayroll, tickets });
}
