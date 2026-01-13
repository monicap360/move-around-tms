import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("driver_applications")
    .select(
      "id, name, email, phone, experience, license_type, notes, resume_url, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
