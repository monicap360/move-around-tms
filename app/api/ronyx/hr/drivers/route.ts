import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, full_name")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const drivers = (data || []).map((driver) => ({
    id: driver.id,
    name: driver.name || driver.full_name || "Driver",
  }));

  return NextResponse.json({ drivers });
}
