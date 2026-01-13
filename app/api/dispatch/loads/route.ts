import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("loads").select("*");
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}
