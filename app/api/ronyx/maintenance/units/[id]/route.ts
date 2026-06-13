import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("maintenance_units")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ unit: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("maintenance_units")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
