import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("driver_documents_expiring")
    .select("*")
    .order("expiration_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
