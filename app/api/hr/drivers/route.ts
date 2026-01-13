import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  // Use the enhanced drivers view for all relevant fields
  const { data, error } = await supabase.from("drivers_enhanced").select("*");
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}
