import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(_req, { params }) {
  const { driver_uuid } = params;

  const { data, error } = await client
    .from("drivers")
    .select("full_name, phone, email, rank, experience_years")
    .eq("driver_uuid", driver_uuid)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
