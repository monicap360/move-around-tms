import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Use the enhanced drivers view for all relevant fields
  const { data, error } = await supabase.from("drivers_enhanced").select("*");
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}
