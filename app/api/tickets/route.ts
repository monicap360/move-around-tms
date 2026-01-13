import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  // Fetch tickets from Supabase
  const { data, error } = await supabase.from("tickets").select("*").limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Ensure always returns an array
  return NextResponse.json(Array.isArray(data) ? data : []);
}
